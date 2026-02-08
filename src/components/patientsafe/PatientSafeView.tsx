import { useState, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Attachment {
  name: string;
  type: "image" | "file";
  preview?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface FacilityRecommendation {
  name: string;
  distance: string;
  capabilities: { name: string; available: boolean }[];
  evidence: string;
  triageLevel: "critical" | "stable" | "monitor";
}

const facilities: FacilityRecommendation[] = [
  {
    name: "Korle Bu Teaching Hospital",
    distance: "12 km • ~18 min",
    triageLevel: "critical",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: true },
      { name: "Neonatal ICU", available: true },
      { name: "OB Ultrasound", available: true },
    ],
    evidence: "Verified by CHAG audit (Jan 2026). Equipment calibration current. 3 OB/GYN on staff.",
  },
  {
    name: "Ridge Hospital",
    distance: "8 km • ~14 min",
    triageLevel: "stable",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: true },
      { name: "Neonatal ICU", available: false },
      { name: "OB Ultrasound", available: true },
    ],
    evidence: "Last inspected Dec 2025. Missing neonatal ventilator. 2 OB/GYN, 1 on leave.",
  },
  {
    name: "Tema General Hospital",
    distance: "24 km • ~35 min",
    triageLevel: "monitor",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: false },
      { name: "Neonatal ICU", available: true },
      { name: "OB Ultrasound", available: true },
    ],
    evidence: "Blood supply intermittent. Cross-match capability available. 4 OB/GYN on staff.",
  },
];

const triageColors = {
  critical: "bg-danger/15 text-danger border-danger/25",
  stable: "bg-success/15 text-success border-success/25",
  monitor: "bg-warning/15 text-warning border-warning/25",
};

const triageLabels = {
  critical: "CRITICAL",
  stable: "STABLE",
  monitor: "MONITOR",
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Welcome, Doctor. Upload lab results, imaging, or describe the patient presentation. I will cross-reference verified facility capabilities for the safest referral recommendation.",
  },
];

const PatientSafeView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      name: file.name,
      type,
      preview: type === "image" ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input || (attachments.length > 0 ? `Attached ${attachments.length} file(s) for review` : ""),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: attachments.length > 0
        ? `Received ${attachments.length} clinical attachment(s). Cross-referencing with facility capability matrix... Based on the clinical data${input ? ` regarding "${input}"` : ""}, Korle Bu Teaching Hospital is the top verified match for this case profile.`
        : `Based on the clinical scenario: "${input}" — I've identified 3 facilities within safe transfer radius. Top recommendation: Korle Bu Teaching Hospital, fully verified for emergency obstetric care.`,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachments([]);
    setShowResults(true);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        const voiceMsg: ChatMessage = { role: "user", content: "Patient presenting with severe preeclampsia, 34 weeks gestation" };
        setMessages((prev) => [...prev, voiceMsg]);
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: "⚠️ Severe preeclampsia at 34 weeks — high-risk. Immediate referral needed: magnesium sulfate protocol, emergency C-section capability, and NICU. Top match: Korle Bu Teaching Hospital (fully verified, 3 OB/GYN on staff).",
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsListening(false);
          setShowResults(true);
        }, 1500);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            PatientSafe
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 md:mt-2 max-w-xl leading-relaxed">
            Describe symptoms, upload records, or use voice. Get verified facility referrals with forensic evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-3 md:px-4 py-1.5 md:py-2">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
            <span className="text-[10px] md:text-xs font-mono text-success font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Emergency Banner */}
      <div className="bg-danger/8 border border-danger/20 rounded-xl p-4 md:p-5 flex items-start gap-3 md:gap-4 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-danger/5 to-transparent pointer-events-none" />
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-danger/15 flex items-center justify-center flex-shrink-0 relative">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-danger" />
        </div>
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <p className="text-base md:text-lg font-bold text-danger">Emergency Red Flag</p>
            <span className="text-[10px] md:text-xs font-mono bg-danger/20 text-danger px-2 py-0.5 md:px-2.5 md:py-1 rounded animate-pulse-slow font-semibold">
              CODE RED
            </span>
          </div>
          <p className="text-xs md:text-sm text-danger/70 mt-1.5 md:mt-2 leading-relaxed">
            Northern Region — Critical maternal care gap. 3 facilities below minimum safe standard for obstetric emergencies.
          </p>
        </div>
      </div>

      {/* Clinical Quick Actions */}
      <div className="flex items-center gap-2.5 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { icon: Upload, label: "Upload Records", desc: "PDF, DICOM, CSV" },
          { icon: Syringe, label: "Blood Type", desc: "Cross-match" },
          { icon: Thermometer, label: "Vital Signs", desc: "Protocol" },
          { icon: HeartPulse, label: "Cardiac", desc: "Emergency" },
          { icon: Stethoscope, label: "OB/GYN", desc: "Maternal" },
        ].map((action) => (
          <button
            key={action.label}
            className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-border bg-card shadow-xs hover:border-primary/30 hover:shadow-sm transition-all text-sm whitespace-nowrap flex-shrink-0"
          >
            <action.icon className="w-5 h-5 text-primary" />
            <div className="text-left">
              <span className="block text-sm font-semibold text-foreground">{action.label}</span>
              <span className="block text-xs text-muted-foreground">{action.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Chat Interface */}
        <div className="bg-card rounded-xl border border-border flex flex-col h-[450px] md:h-[580px] animate-fade-in shadow-sm">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-success animate-pulse" />
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <h3 className="text-sm md:text-base font-bold text-foreground">Clinical Console</h3>
            </div>
            <span className="text-[10px] md:text-xs font-mono text-muted-foreground bg-secondary px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-border">
              HIPAA
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-xl animate-fade-in",
                  msg.role === "user" ? "ml-auto" : ""
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono text-primary font-semibold">PatientSafe AI</span>
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-xl px-4 py-3.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 text-foreground"
                      : "bg-secondary border border-border text-foreground"
                  )}
                >
                  {msg.content}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((att, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border border-border"
                        >
                          {att.type === "image" ? (
                            att.preview ? (
                              <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <Image className="w-4 h-4 text-primary" />
                            )
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
            ))}
            {isListening && (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-danger/10 border border-danger/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                  <span className="text-sm font-semibold text-danger">Listening...</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className="w-0.5 bg-danger rounded-full animate-pulse"
                        style={{ height: `${10 + Math.random() * 14}px`, animationDelay: `${idx * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="px-5 pt-3 flex flex-wrap gap-2 border-t border-border">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5 border border-border group"
                >
                  {att.type === "image" && att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-7 h-7 rounded object-cover" />
                  ) : att.type === "image" ? (
                    <Image className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-warning" />
                  )}
                  <span className="text-xs text-foreground truncate max-w-[100px]">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="w-5 h-5 rounded-full bg-muted hover:bg-danger/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-danger" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 md:p-5 border-t border-border">
            <div className="flex items-center gap-1.5 md:gap-2.5">
              {/* Attach files */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 md:w-11 md:h-11 rounded-xl border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all flex-shrink-0"
                title="Attach clinical document"
              >
                <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.csv,.dicom" multiple onChange={(e) => handleFileSelect(e, "file")} />

              {/* Camera — opens device camera on mobile */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-9 h-9 md:w-11 md:h-11 rounded-xl border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all flex-shrink-0"
                title="Take photo"
              >
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, "image")} />

              {/* Attach images — gallery picker, visible on larger screens */}
              <button
                onClick={() => imageInputRef.current?.click()}
                className="hidden sm:flex w-9 h-9 md:w-11 md:h-11 rounded-xl border border-border bg-secondary/50 items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all flex-shrink-0"
                title="Attach medical imaging"
              >
                <Image className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileSelect(e, "image")} />

              {/* Text input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe symptoms..."
                className="flex-1 min-w-0 bg-secondary border border-border rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {/* Voice */}
              <button
                onClick={toggleListening}
                className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  isListening
                    ? "bg-danger text-danger-foreground animate-pulse-slow"
                    : "border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                )}
                title={isListening ? "Stop recording" : "Voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
              </button>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachments.length === 0}
                className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  input.trim() || attachments.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-2 md:mt-3 px-1">
              Type, use voice, take a photo, or attach records for AI-assisted triage
            </p>
          </div>
        </div>

        {/* Facility Recommendations */}
        {showResults && (
          <div className="space-y-4 md:space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2 md:gap-3">
                <Stethoscope className="w-5 h-5 text-primary" />
                Verified Facility Referrals
              </h3>
              <span className="text-[11px] md:text-xs font-mono text-muted-foreground">
                3 matches · sorted by clinical fit
              </span>
            </div>

            {facilities.map((facility, i) => (
              <div
                key={facility.name}
                className={cn(
                  "bg-card rounded-xl border border-border p-4 md:p-6 transition-all duration-200 hover:border-primary/30 shadow-sm hover:shadow-md",
                  i === 0 && "ring-1 ring-primary/15 shadow-md"
                )}
              >
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="text-xs md:text-sm font-mono bg-primary/10 text-primary w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <h4 className="text-sm md:text-base font-bold text-foreground truncate">{facility.name}</h4>
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

                <div className="flex items-center gap-2 mb-3 md:mb-4 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-mono">{facility.distance}</span>
                </div>

                {/* Capabilities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5 mb-4 md:mb-5">
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
                          cap.available ? "text-foreground" : "text-muted-foreground line-through"
                        )}
                      >
                        {cap.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Evidence */}
                <div className="bg-accent rounded-xl p-3 md:p-4 border border-border">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
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
        )}
      </div>
    </div>
  );
};

export default PatientSafeView;
