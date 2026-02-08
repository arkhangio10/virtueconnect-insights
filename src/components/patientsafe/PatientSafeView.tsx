import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  MapPin,
  Shield,
  Clock,
  MessageSquare,
  Paperclip,
  Image,
  FileText,
  X,
  Stethoscope,
  Activity,
  Syringe,
  Thermometer,
  HeartPulse,
  Mic,
  MicOff,
  Upload,
  Camera,
  LocateFixed,
  Loader2,
  Navigation,
  Bot,
  MousePointerClick,
  Volume2,
  VolumeX,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useFacilitiesData } from "@/hooks/useFacilitiesData";
import { useSoniaChat, type SoniaMessage } from "@/hooks/useSoniaChat";
import {
  type ClinicalContext,
  type FacilityRecommendation,
  detectClinicalIntent,
  deriveContextualRecommendations,
  filterMarkersByCaps,
} from "@/lib/facility-data";
import GoogleMapView, { type PatientLocation } from "@/components/dashboard/GoogleMapView";
import { useVoice } from "@/hooks/useVoice";

const CONTEXT_LABELS: Record<ClinicalContext, string> = {
  general: "General",
  obstetric: "OB/GYN Emergency",
  cardiac: "Cardiac Emergency",
  blood: "Blood / Transfusion",
  vitals: "Emergency Vitals",
  trauma: "Trauma",
  pediatric: "Pediatric",
  surgical: "Surgical",
};

const PatientSafeView = () => {
  const { facilities, markers, actionPlan, metrics, loading: dataLoading } =
    useFacilitiesData();
  const sonia = useSoniaChat();
  const voice = useVoice();

  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [clinicalContext, setClinicalContext] = useState<ClinicalContext>("general");
  const [requiredCaps, setRequiredCaps] = useState<string[]>([]);
  const [mapClickMode, setMapClickMode] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Start conversation on mount
  useEffect(() => {
    sonia.startConversation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sonia.messages]);

  // Auto-speak new assistant messages
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (!voice.autoSpeak) return;
    if (sonia.messages.length <= lastMsgCountRef.current) {
      lastMsgCountRef.current = sonia.messages.length;
      return;
    }
    lastMsgCountRef.current = sonia.messages.length;
    const lastMsg = sonia.messages[sonia.messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content) {
      voice.speak(lastMsg.content);
    }
  }, [sonia.messages, voice.autoSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fill input from STT transcript
  useEffect(() => {
    if (voice.transcript) {
      setInput(voice.transcript);
    }
  }, [voice.transcript]);

  // Derive recommendations
  const recommendations: FacilityRecommendation[] = useMemo(
    () => deriveContextualRecommendations(facilities, clinicalContext, 3, requiredCaps),
    [facilities, clinicalContext, requiredCaps]
  );

  // Build rank map: facility name → rank (1-based)
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    recommendations.forEach((r, i) => map.set(r.name, i + 1));
    return map;
  }, [recommendations]);

  // Filter map markers
  const filteredMapMarkers = useMemo(() => {
    if (requiredCaps.length === 0) return markers;
    const matchingNames = filterMarkersByCaps(facilities, requiredCaps);
    return markers.filter((m) => matchingNames.has(m.name));
  }, [markers, facilities, requiredCaps]);

  // Build facility context string to send to Gemini so recommendations match
  const buildFacilityContext = useCallback(
    (ctx: ClinicalContext, caps: string[]) => {
      const recs = deriveContextualRecommendations(facilities, ctx, 5, caps);
      if (recs.length === 0) return "";

      const lines = recs.map((r, i) => {
        const availCaps = r.capabilities
          .filter((c) => c.available)
          .map((c) => c.name)
          .join(", ");
        const missingCaps = r.capabilities
          .filter((c) => !c.available)
          .map((c) => c.name)
          .join(", ");
        return `${i + 1}. ${r.name} — ${r.distance} | Available: ${availCaps || "none"} | Missing: ${missingCaps || "none"} | Triage: ${r.triageLevel} | Evidence: ${r.evidence}`;
      });

      return `[SYSTEM: The PatientSafe system has identified these verified facilities matching the patient's needs. You MUST reference ONLY these facilities in your recommendations, using their EXACT names. Do NOT recommend other facilities.\n${lines.join("\n")}]`;
    },
    [facilities]
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleGPSLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: PatientLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Patient (GPS)",
        };
        sonia.setPatientLocation(loc);
        setLocatingGPS(false);
      },
      () => setLocatingGPS(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [sonia]);

  const handleMapClickLocation = useCallback(
    (coords: { lat: number; lng: number }) => {
      const loc: PatientLocation = {
        lat: coords.lat,
        lng: coords.lng,
        label: "Patient (map)",
      };
      sonia.setPatientLocation(loc);
      setMapClickMode(false);
    },
    [sonia]
  );

  const handleSend = useCallback(() => {
    if (!input.trim() && pendingFiles.length === 0) return;

    let ctx = clinicalContext;
    let caps = requiredCaps;

    // Detect clinical context from text
    if (input.trim()) {
      const detected = detectClinicalIntent(input);
      ctx = detected.context;
      caps = detected.requiredCaps;
      setClinicalContext(ctx);
      setRequiredCaps(caps);
    }

    // Build facility context so Gemini matches the frontend recommendations
    const facilityCtx = buildFacilityContext(ctx, caps);

    sonia.sendMessage(
      input,
      pendingFiles.length > 0 ? pendingFiles : undefined,
      facilityCtx || undefined
    );
    setInput("");
    setPendingFiles([]);
  }, [input, pendingFiles, sonia, clinicalContext, requiredCaps, buildFacilityContext]);

  const handleQuickAction = useCallback(
    (label: string) => {
      const queries: Record<string, { text: string; ctx: ClinicalContext; caps: string[] }> = {
        "Blood Type": { text: "Patient needs blood type cross-match and transfusion capability", ctx: "blood", caps: ["blood_bank"] },
        "Vital Signs": { text: "Patient presenting with unstable vital signs — need facility with 24/7 emergency", ctx: "vitals", caps: ["emergency_24_7"] },
        "Cardiac": { text: "Cardiac emergency — need facility with cardiac surgery or advanced cardiac care", ctx: "cardiac", caps: ["emergency_24_7", "general_surgery"] },
        "OB/GYN": { text: "Obstetric emergency — need facility with safe C-section, blood bank, and NICU", ctx: "obstetric", caps: ["c_section"] },
      };

      const action = queries[label];
      if (!action) return;

      setClinicalContext(action.ctx);
      setRequiredCaps(action.caps);

      // Build facility context so Gemini recommends the same facilities as the panel
      const facilityCtx = buildFacilityContext(action.ctx, action.caps);
      sonia.sendMessage(action.text, undefined, facilityCtx || undefined);
    },
    [sonia, buildFacilityContext]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setPendingFiles((prev) => [...prev, ...Array.from(files)]);
      e.target.value = "";
      setShowAttachMenu(false);
    },
    []
  );

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Render helpers ──────────────────────────────────────────────────────
  const renderMessage = (msg: SoniaMessage, idx: number) => {
    const isUser = msg.role === "user";
    return (
      <div
        key={idx}
        className={cn("max-w-[85%] animate-fade-in", isUser ? "ml-auto" : "")}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary font-semibold">
              Sonia
            </span>
            <button
              onClick={() => voice.speaking ? voice.stopSpeaking() : voice.speak(msg.content)}
              className="ml-auto p-1 rounded-md hover:bg-secondary transition-colors"
              title={voice.speaking ? "Stop speaking" : "Read aloud"}
            >
              {voice.speaking ? (
                <VolumeX className="w-3.5 h-3.5 text-danger" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              )}
            </button>
          </div>
        )}
        <div
          className={cn(
            "rounded-xl px-4 py-3.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary/10 border border-primary/20 text-foreground whitespace-pre-wrap"
              : "bg-secondary border border-border text-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground"
          )}
        >
          {isUser ? msg.content : (
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          )}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {msg.attachments.map((att, j) => (
                <div
                  key={j}
                  className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border border-border"
                >
                  {att.type.startsWith("image/") ? (
                    <Image className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-warning" />
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {att.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const triageColors: Record<string, string> = {
    critical: "bg-danger/15 text-danger border-danger/25",
    stable: "bg-success/15 text-success border-success/25",
    monitor: "bg-warning/15 text-warning border-warning/25",
  };
  const triageLabels: Record<string, string> = {
    critical: "CRITICAL",
    stable: "STABLE",
    monitor: "MONITOR",
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            Sonia — PatientSafe
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 md:mt-2 max-w-xl leading-relaxed">
            AI clinical assistant — facility referrals, drug interaction checks,
            and evidence-based routing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-3 md:px-4 py-1.5 md:py-2">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
            <span className="text-[10px] md:text-xs font-mono text-success font-semibold">
              LIVE
            </span>
          </div>
          {sonia.patientLocation && (
            <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] md:text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold">
                PATIENT SET
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Location + Quick Actions bar */}
      <div className="flex items-center gap-2.5 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {/* GPS Locate */}
        <button
          onClick={handleGPSLocate}
          disabled={locatingGPS}
          className={cn(
            "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border shadow-xs transition-all text-sm whitespace-nowrap flex-shrink-0 active:scale-95",
            sonia.patientLocation
              ? "border-purple-300 bg-purple-50 dark:bg-purple-950/30"
              : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
          )}
        >
          {locatingGPS ? (
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
          ) : (
            <Navigation
              className={cn(
                "w-5 h-5",
                sonia.patientLocation ? "text-purple-500" : "text-primary"
              )}
            />
          )}
          <div className="text-left">
            <span className="block text-sm font-semibold text-foreground">
              {sonia.patientLocation ? "Patient Located" : "GPS Locate"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {sonia.patientLocation
                ? `${sonia.patientLocation.lat.toFixed(3)}, ${sonia.patientLocation.lng.toFixed(3)}`
                : "Auto position"}
            </span>
          </div>
        </button>

        {/* Map Click mode */}
        <button
          onClick={() => setMapClickMode(!mapClickMode)}
          className={cn(
            "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border shadow-xs transition-all text-sm whitespace-nowrap flex-shrink-0 active:scale-95",
            mapClickMode
              ? "border-purple-400 bg-purple-100 dark:bg-purple-950/40 ring-2 ring-purple-300"
              : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
          )}
        >
          <MousePointerClick
            className={cn("w-5 h-5", mapClickMode ? "text-purple-500" : "text-primary")}
          />
          <div className="text-left">
            <span className="block text-sm font-semibold text-foreground">
              {mapClickMode ? "Click Map Now" : "Set on Map"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {mapClickMode ? "Click a location..." : "Manual pin"}
            </span>
          </div>
        </button>

        {/* Quick clinical actions */}
        {[
          { icon: Upload, label: "Upload Records", desc: "PDF, Images" },
          { icon: Syringe, label: "Blood Type", desc: "Cross-match" },
          { icon: Thermometer, label: "Vital Signs", desc: "Protocol" },
          { icon: HeartPulse, label: "Cardiac", desc: "Emergency" },
          { icon: Stethoscope, label: "OB/GYN", desc: "Maternal" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.label === "Upload Records") {
                fileInputRef.current?.click();
                return;
              }
              handleQuickAction(action.label);
            }}
            className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-border bg-card shadow-xs hover:border-primary/30 hover:shadow-sm transition-all text-sm whitespace-nowrap flex-shrink-0 active:scale-95"
          >
            <action.icon className="w-5 h-5 text-primary" />
            <div className="text-left">
              <span className="block text-sm font-semibold text-foreground">
                {action.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {action.desc}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* ── Chat Panel ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border flex flex-col h-[500px] md:h-[620px] animate-fade-in shadow-sm">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-success animate-pulse" />
              <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <h3 className="text-sm md:text-base font-bold text-foreground">
                Sonia — Clinical Console
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {clinicalContext !== "general" && (
                <span className="text-[10px] md:text-xs font-mono font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {CONTEXT_LABELS[clinicalContext]}
                </span>
              )}
              {/* Auto-speak toggle */}
              <button
                onClick={() => {
                  if (voice.speaking) voice.stopSpeaking();
                  voice.setAutoSpeak(!voice.autoSpeak);
                }}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] md:text-xs font-mono font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-full border transition-all",
                  voice.autoSpeak
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground border-border"
                )}
                title={voice.autoSpeak ? "Voice ON — click to mute" : "Voice OFF — click to enable"}
              >
                {voice.autoSpeak ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
                {voice.speaking ? "Speaking..." : voice.autoSpeak ? "Voice ON" : "Voice OFF"}
              </button>
              <span className="text-[10px] md:text-xs font-mono text-muted-foreground bg-secondary px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-border">
                HIPAA
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {sonia.messages.map((msg, i) => renderMessage(msg, i))}
            {sonia.loading && (
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Pending file previews */}
          {pendingFiles.length > 0 && (
            <div className="px-5 pt-3 flex flex-wrap gap-2 border-t border-border">
              {pendingFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5 border border-border"
                >
                  {file.type.startsWith("image/") ? (
                    <Image className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-warning" />
                  )}
                  <span className="text-xs text-foreground truncate max-w-[100px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="w-5 h-5 rounded-full bg-muted hover:bg-danger/20 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 md:p-5 border-t border-border">
            {showAttachMenu && (
              <div className="flex items-center gap-2 mb-2.5 animate-fade-in">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs font-medium">PDF / Document</span>
                </button>
                <button
                  onClick={() => {
                    cameraInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-medium">Camera</span>
                </button>
                <button
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Image className="w-4 h-4" />
                  <span className="text-xs font-medium">Photo</span>
                </button>
              </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.csv,image/*" multiple onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
            <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />

            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  showAttachMenu
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "border border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {showAttachMenu ? (
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={voice.listening ? "Listening..." : "Describe symptoms, medications, or ask Sonia..."}
                className={cn(
                  "flex-1 min-w-0 bg-secondary border rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                  voice.listening ? "border-danger/50 ring-2 ring-danger/20" : "border-border"
                )}
              />

              {/* Mic button */}
              {voice.sttAvailable && (
                <button
                  onClick={() => {
                    if (voice.listening) {
                      voice.stopListening();
                      // Auto-send after short delay to get final transcript
                      setTimeout(() => {
                        const currentInput = document.querySelector<HTMLInputElement>(
                          'input[placeholder*="Sonia"], input[placeholder="Listening..."]'
                        )?.value;
                        if (currentInput?.trim()) {
                          handleSend();
                        }
                      }, 500);
                    } else {
                      voice.stopSpeaking(); // Stop TTS if playing
                      voice.startListening();
                    }
                  }}
                  className={cn(
                    "w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                    voice.listening
                      ? "bg-danger text-white animate-pulse shadow-lg shadow-danger/30"
                      : "border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  )}
                  title={voice.listening ? "Stop listening" : "Voice input"}
                >
                  {voice.listening ? (
                    <MicOff className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Mic className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={(!input.trim() && pendingFiles.length === 0) || sonia.loading}
                className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  input.trim() || pendingFiles.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {sonia.loading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-2 md:mt-3 px-1">
              Send text, upload prescriptions/images (PDF, JPG, PNG) — Sonia
              checks drug interactions automatically.
              {voice.sttAvailable && " Press mic for voice input."}
            </p>
          </div>
        </div>

        {/* ── Referrals Panel ──────────────────────────────────────────── */}
        <div className="space-y-4 md:space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2 md:gap-3">
              <Stethoscope className="w-5 h-5 text-primary" />
              Verified Facility Referrals
            </h3>
            <div className="flex items-center gap-2">
              {clinicalContext !== "general" && (
                <span className="text-[10px] md:text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {CONTEXT_LABELS[clinicalContext]}
                </span>
              )}
              <span className="text-[11px] md:text-xs font-mono text-muted-foreground">
                {dataLoading
                  ? "Loading..."
                  : `${recommendations.length} matches`}
              </span>
            </div>
          </div>

          {!dataLoading && recommendations.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-4 md:p-6 text-sm text-muted-foreground text-center">
              <Stethoscope className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              Tell Sonia what the patient needs to see matched facilities.
            </div>
          )}

          {recommendations.map((facility, i) => (
            <div
              key={facility.name}
              className={cn(
                "bg-card rounded-xl border border-border p-4 md:p-5 transition-all duration-200 hover:border-primary/30 shadow-sm hover:shadow-md",
                i === 0 && "ring-1 ring-primary/15 shadow-md"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <span className="text-xs md:text-sm font-mono bg-primary/10 text-primary w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <h4 className="text-sm md:text-base font-bold text-foreground truncate">
                    {facility.name}
                  </h4>
                </div>
                <span
                  className={cn(
                    "text-[10px] md:text-xs font-mono font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full border flex-shrink-0 ml-2",
                    triageColors[facility.triageLevel]
                  )}
                >
                  {triageLabels[facility.triageLevel]}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-mono">
                  {facility.distance}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5 mb-4">
                {facility.capabilities.map((cap) => (
                  <div key={cap.name} className="flex items-center gap-2">
                    {cap.available ? (
                      <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-danger flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs md:text-sm",
                        cap.available
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      )}
                    >
                      {cap.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-accent rounded-xl p-3 md:p-4 border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-bold">
                    Verified Evidence
                  </span>
                </div>
                <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                  {facility.evidence}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Facility Map
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mapClickMode ? (
                <span className="text-purple-500 font-semibold animate-pulse">
                  Click anywhere on the map to set patient location...
                </span>
              ) : requiredCaps.length > 0 ? (
                `Showing ${filteredMapMarkers.length} facilities with: ${requiredCaps.map((c) => c.replace(/_/g, " ")).join(", ")}`
              ) : (
                `${filteredMapMarkers.length} facilities`
              )}
            </p>
          </div>
          {clinicalContext !== "general" && (
            <span className="text-[10px] md:text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {CONTEXT_LABELS[clinicalContext]}
            </span>
          )}
        </div>
        <div
          className={cn(
            "relative",
            mapClickMode && "ring-2 ring-purple-400 ring-inset"
          )}
        >
          <GoogleMapView
            markers={filteredMapMarkers.map((m) => ({
              lat: m.lat,
              lng: m.lng,
              status: m.status,
              name: m.name,
              category: m.category,
              region: m.region,
            }))}
            patientLocation={sonia.patientLocation ? { ...sonia.patientLocation, label: "Patient" } : null}
            mapClickMode={mapClickMode}
            onMapClickLocation={handleMapClickLocation}
            rankMap={rankMap}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-border">
          {sonia.patientLocation && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                Patient: {sonia.patientLocation.lat.toFixed(3)}, {sonia.patientLocation.lng.toFixed(3)}
              </span>
              <button
                onClick={() => sonia.setPatientLocation(null as any)}
                className="ml-1 text-purple-400 hover:text-purple-600 transition-colors"
                title="Clear patient location"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">
              Validated (
              {filteredMapMarkers.filter((m) => m.status === "validated").length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span className="text-xs text-muted-foreground">
              Uncertain (
              {filteredMapMarkers.filter((m) => m.status === "uncertain").length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger" />
            <span className="text-xs text-muted-foreground">
              Anomaly (
              {filteredMapMarkers.filter((m) => m.status === "anomaly").length})
            </span>
          </div>
          <div className="ml-auto text-xs font-mono text-muted-foreground">
            {filteredMapMarkers.length} facilities
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSafeView;
