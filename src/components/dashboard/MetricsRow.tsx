import { Building2, HeartPulse, AlertTriangle, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  glowClass?: string;
}

const MetricCard = ({ icon, label, value, change, changeType, glowClass }: MetricCardProps) => (
  <div
    className={cn(
      "gradient-card rounded-xl border border-border p-5 transition-all duration-300 hover:border-primary/30 animate-fade-in",
      glowClass
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
        {icon}
      </div>
      <span
        className={cn(
          "text-xs font-mono font-medium px-2 py-0.5 rounded-full",
          changeType === "positive" && "bg-success/10 text-success",
          changeType === "negative" && "bg-danger/10 text-danger",
          changeType === "neutral" && "bg-warning/10 text-warning"
        )}
      >
        {change}
      </span>
    </div>
    <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const MetricsRow = () => {
  const metrics: MetricCardProps[] = [
    {
      icon: <Building2 className="w-5 h-5 text-primary" />,
      label: "Total Facilities",
      value: "4,218",
      change: "+12 this week",
      changeType: "positive",
      glowClass: "card-glow",
    },
    {
      icon: <HeartPulse className="w-5 h-5 text-success" />,
      label: "Facilities with Safe C-Section",
      value: "1,847",
      change: "43.8%",
      changeType: "positive",
      glowClass: "card-glow-success",
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      label: "High-Risk Anomalies",
      value: "312",
      change: "+8 flagged",
      changeType: "negative",
      glowClass: "card-glow-accent",
    },
    {
      icon: <MapPinOff className="w-5 h-5 text-danger" />,
      label: "Medical Deserts Detected",
      value: "67",
      change: "3 new regions",
      changeType: "neutral",
      glowClass: "card-glow-danger",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric, i) => (
        <MetricCard key={i} {...metric} />
      ))}
    </div>
  );
};

export default MetricsRow;
