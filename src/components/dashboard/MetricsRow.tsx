import { Building2, HeartPulse, AlertTriangle, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

const MetricCard = ({ icon, label, value, change, changeType }: MetricCardProps) => (
  <div className="gradient-card rounded-xl border border-border p-4 animate-fade-in">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
      <span
        className={cn(
          "ml-auto text-[10px] font-mono font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
          changeType === "positive" && "bg-success/10 text-success",
          changeType === "negative" && "bg-danger/10 text-danger",
          changeType === "neutral" && "bg-warning/10 text-warning"
        )}
      >
        {change}
      </span>
    </div>
  </div>
);

const MetricsRow = () => {
  const metrics: MetricCardProps[] = [
    {
      icon: <Building2 className="w-4 h-4 text-primary" />,
      label: "Total Facilities",
      value: "4,218",
      change: "+12",
      changeType: "positive",
    },
    {
      icon: <HeartPulse className="w-4 h-4 text-success" />,
      label: "Safe C-Section",
      value: "1,847",
      change: "43.8%",
      changeType: "positive",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-warning" />,
      label: "High-Risk Anomalies",
      value: "312",
      change: "+8",
      changeType: "negative",
    },
    {
      icon: <MapPinOff className="w-4 h-4 text-danger" />,
      label: "Medical Deserts",
      value: "67",
      change: "+3",
      changeType: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map((metric, i) => (
        <MetricCard key={i} {...metric} />
      ))}
    </div>
  );
};

export default MetricsRow;
