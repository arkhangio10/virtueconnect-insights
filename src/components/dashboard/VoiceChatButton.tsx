import { useState } from "react";
import { Mic, MicOff, X, MessageCircle, Send, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const VoiceChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Welcome, Doctor. I'm your VirtueConnect assistant. Ask about facility data, anomalies, regional reports, or patient referrals." },
  ]);

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "user", text: "Show me anomalies in Northern Region" },
        ]);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: "Found 3 anomalies in the Northern Region: Yendi Municipal Hospital (data discrepancy), Kintampo Health Center (equipment gap), and Tamale Sub-district (unreported)." },
          ]);
          setIsListening(false);
        }, 1500);
      }, 2000);
    }
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    const userText = textInput.trim();
    setTextInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Analyzing: "${userText}". Cross-referencing verified facility data across Ghana's healthcare network...` },
      ]);
    }, 1200);
  };

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
            <span className="text-[10px] md:text-xs font-mono text-muted-foreground bg-secondary px-2 md:px-3 py-1 rounded-full border border-border">
              AI · Active
            </span>
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
                      ? "bg-primary/10 text-foreground border border-primary/20"
                      : "bg-secondary text-foreground border border-border"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isListening && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-danger/10 border border-danger/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                  <span className="text-sm font-medium text-danger">Listening...</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-danger rounded-full animate-pulse"
                        style={{
                          height: `${10 + Math.random() * 14}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-4 md:px-5 py-3 md:py-4 border-t border-border space-y-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                placeholder="Ask about facilities or patients..."
                className="flex-1 bg-secondary border border-border rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleTextSend}
                disabled={!textInput.trim()}
                className={cn(
                  "w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                  textInput.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="text-xs text-muted-foreground">or use voice</span>
              <button
                onClick={toggleListening}
                className={cn(
                  "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isListening
                    ? "bg-danger text-danger-foreground animate-pulse-slow shadow-lg"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceChatButton;
