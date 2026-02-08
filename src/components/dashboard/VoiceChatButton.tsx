import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, X, MessageCircle, Send, Stethoscope, Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/useVoice";
import { useFacilitiesData } from "@/hooks/useFacilitiesData";
import ReactMarkdown from "react-markdown";

const SONIA_API_BASE =
  (import.meta.env.VITE_SONIA_API_URL as string | undefined) ?? "http://localhost:3001";

type ChatMessage = { role: "user" | "assistant"; text: string };

const VoiceChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Welcome, Doctor. I'm your CareBridge assistant. Ask about facility data, anomalies, regional reports, or patient referrals. You can type or use voice." },
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const voice = useVoice();
  const { facilities } = useFacilitiesData();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fill input from STT transcript
  useEffect(() => {
    if (voice.transcript) {
      setTextInput(voice.transcript);
    }
  }, [voice.transcript]);

  // Auto-speak new assistant messages
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (!voice.autoSpeak) return;
    if (messages.length <= lastMsgCountRef.current) {
      lastMsgCountRef.current = messages.length;
      return;
    }
    lastMsgCountRef.current = messages.length;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.text) {
      voice.speak(lastMsg.text);
    }
  }, [messages, voice.autoSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start conversation on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      fetch(`${SONIA_API_BASE}/api/sonia/start`, { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          setConversationId(data.conversationId);
        })
        .catch(() => { /* offline mode */ });
    }
  }, [isOpen, conversationId]);

  const handleTextSend = useCallback(async () => {
    if (!textInput.trim() || loading) return;
    const userText = textInput.trim();
    setTextInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      if (!conversationId) throw new Error("No connection");

      // Build basic facility context for the dashboard assistant
      const topFacilities = facilities
        .filter((f) => f.anomalies && f.anomalies.length > 0)
        .slice(0, 5)
        .map((f) => `${f.name} (${f.region}) — ${f.anomalies!.length} anomalies`)
        .join("; ");

      const contextNote = topFacilities
        ? `\n[Dashboard context: Top flagged facilities: ${topFacilities}]`
        : "";

      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("text", userText + contextNote);

      const res = await fetch(`${SONIA_API_BASE}/api/sonia/chat`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.message.content }]);
    } catch {
      // Fallback: generate a simple response using facility data
      const total = facilities.length;
      const anomalyCount = facilities.filter((f) => f.anomalies && f.anomalies.length > 0).length;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `I'm analyzing "${userText}" across ${total} facilities. ${anomalyCount} facilities have flagged anomalies. For detailed analysis, please ensure the Sonia backend is running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [textInput, conversationId, facilities, loading]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
          isOpen
            ? "bg-secondary border border-border text-muted-foreground hover:text-foreground"
            : "bg-primary text-primary-foreground hover:scale-105 card-glow"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Voice Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-24 left-3 right-3 md:left-auto md:right-6 z-50 md:w-[420px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[75vh] flex flex-col">
          {/* Header */}
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <Stethoscope className="w-5 h-5 text-primary" />
              <h4 className="text-sm md:text-base font-bold text-foreground">Clinical Assistant</h4>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-speak toggle */}
              <button
                onClick={() => {
                  if (voice.speaking) voice.stopSpeaking();
                  voice.setAutoSpeak(!voice.autoSpeak);
                }}
                className={cn(
                  "p-1.5 rounded-lg border transition-all",
                  voice.autoSpeak
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground border-border"
                )}
                title={voice.autoSpeak ? "Voice ON" : "Voice OFF"}
              >
                {voice.autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-[10px] md:text-xs font-mono text-muted-foreground bg-secondary px-2 md:px-3 py-1 rounded-full border border-border">
                AI · Active
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 md:space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3.5 md:px-4 py-2.5 md:py-3 rounded-xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground border border-primary/20 whitespace-pre-wrap"
                      : "bg-secondary text-foreground border border-border prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
                  )}
                >
                  {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 md:px-5 py-3 md:py-4 border-t border-border space-y-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                placeholder={voice.listening ? "Listening..." : "Ask about facilities or patients..."}
                className={cn(
                  "flex-1 bg-secondary border rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                  voice.listening ? "border-danger/50 ring-2 ring-danger/20" : "border-border"
                )}
              />
              <button
                onClick={handleTextSend}
                disabled={!textInput.trim() || loading}
                className={cn(
                  "w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  textInput.trim() && !loading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {voice.sttAvailable && (
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {voice.listening ? "Tap to stop" : "or use voice"}
                </span>
                <button
                  onClick={() => {
                    if (voice.listening) {
                      voice.stopListening();
                      setTimeout(() => {
                        if (textInput.trim()) handleTextSend();
                      }, 500);
                    } else {
                      voice.stopSpeaking();
                      voice.startListening();
                    }
                  }}
                  className={cn(
                    "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    voice.listening
                      ? "bg-danger text-white animate-pulse shadow-lg shadow-danger/30"
                      : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  )}
                >
                  {voice.listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceChatButton;
