import { useState } from "react";
import { Mic, MicOff, X, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const VoiceChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hello! I'm your VirtueConnect voice assistant. Ask me about facility data, anomalies, or regional reports." },
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
        { role: "assistant", text: `Analyzing your query: "${userText}". Based on facility data, I found relevant results across the Ghana healthcare network.` },
      ]);
    }, 1200);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
          isOpen
            ? "bg-secondary border border-border text-muted-foreground hover:text-foreground"
            : "bg-primary text-primary-foreground hover:scale-105 card-glow"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Voice Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <h4 className="text-base font-semibold text-foreground">Voice Assistant</h4>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
              AI · Live
            </span>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto p-4 space-y-3">
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
                    "max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed",
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
                  <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                  <span className="text-xs font-medium text-danger">Listening...</span>
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

          {/* Input Area — Voice + Text */}
          <div className="px-4 py-3 border-t border-border space-y-3">
            {/* Text Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                placeholder="Type your question..."
                className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleTextSend}
                disabled={!textInput.trim()}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  textInput.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Mic Button */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs text-muted-foreground">or use voice</span>
              <button
                onClick={toggleListening}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
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
