import { useState } from "react";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  MapPin,
  Shield,
  Clock,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FacilityRecommendation {
  name: string;
  distance: string;
  capabilities: { name: string; available: boolean }[];
  evidence: string;
}

const facilities: FacilityRecommendation[] = [
  {
    name: "Korle Bu Teaching Hospital",
    distance: "12 km • ~18 min",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: true },
      { name: "Neonatal ICU", available: true },
      { name: "OB Ultrasound", available: true },
    ],
    evidence:
      "Verified by CHAG audit (Jan 2026). Equipment calibration current. 3 OB/GYN on staff.",
  },
  {
    name: "Ridge Hospital",
    distance: "8 km • ~14 min",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: true },
      { name: "Neonatal ICU", available: false },
      { name: "OB Ultrasound", available: true },
    ],
    evidence:
      "Last inspected Dec 2025. Missing neonatal ventilator. 2 OB/GYN, 1 on leave.",
  },
  {
    name: "Tema General Hospital",
    distance: "24 km • ~35 min",
    capabilities: [
      { name: "Emergency C-Section", available: true },
      { name: "Blood Bank", available: false },
      { name: "Neonatal ICU", available: true },
      { name: "OB Ultrasound", available: true },
    ],
    evidence:
      "Blood supply intermittent. Cross-match capability available. 4 OB/GYN on staff.",
  },
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Welcome to PatientSafe. I can help locate verified healthcare facilities based on clinical need. What emergency or care scenario are you assessing?",
  },
];

const PatientSafeView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [showResults, setShowResults] = useState(true);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: input },
      {
        role: "assistant",
        content: `Based on your query about "${input}", I've identified 3 facilities within a safe transfer radius. The top recommendation is Korle Bu Teaching Hospital — fully verified for emergency obstetric care.`,
      },
    ];
    setMessages(newMessages);
    setInput("");
    setShowResults(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          PatientSafe
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verified facility recommendations for emergency clinical decisions
        </p>
      </div>

      {/* Emergency Banner */}
      <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
        <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-danger">Emergency Red Flag Active</p>
          <p className="text-xs text-danger/80 mt-0.5">
            Northern Region — Critical maternal care gap detected. 3 facilities below minimum
            safe standard for obstetric emergencies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Chat Interface */}
        <div className="gradient-card rounded-xl border border-border flex flex-col h-[500px] animate-fade-in">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Clinical Query</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm animate-fade-in",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe clinical scenario..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Facility Recommendations */}
        {showResults && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-foreground">
              Top 3 Recommended Facilities
            </h3>

            {facilities.map((facility, i) => (
              <div
                key={facility.name}
                className={cn(
                  "gradient-card rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary/30",
                  i === 0 && "card-glow"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{facility.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-mono">{facility.distance}</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {facility.capabilities.map((cap) => (
                    <div key={cap.name} className="flex items-center gap-1.5">
                      {cap.available ? (
                        <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-danger flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-[10px]",
                          cap.available ? "text-foreground" : "text-muted-foreground line-through"
                        )}
                      >
                        {cap.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Evidence */}
                <div className="bg-secondary/60 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Verified Evidence
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary-foreground leading-relaxed">
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
