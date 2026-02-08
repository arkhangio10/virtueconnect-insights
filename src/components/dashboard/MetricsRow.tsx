import { Building2, HeartPulse, AlertTriangle, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacilitiesData } from "@/hooks/useFacilitiesData";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

const MetricCard = ({ icon, label, value, change, changeType }: MetricCardProps) => (
  <div className="bg-card rounded-xl border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
    <div className="flex items-center gap-3 md:gap-4">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl md:text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      <span
        className={cn(
          "text-[10px] md:text-xs font-mono font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-full whitespace-nowrap",
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
  const { metrics, loading } = useFacilitiesData();

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const metricCards: MetricCardProps[] = [
    {
      icon: <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />,
      label: "Total Facilities",
      value: loading ? "—" : formatNumber(metrics.totalFacilities),
      change: "LIVE",
      changeType: "neutral",
    },
    {
      icon: <HeartPulse className="w-5 h-5 md:w-6 md:h-6 text-success" />,
      label: "Safe C-Section",
      value: loading ? "—" : formatNumber(metrics.safeCSection),
      change: loading ? "—" : formatPercent(metrics.cSectionCoverage),
      changeType: "positive",
    },
    {
      icon: <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-warning" />,
      label: "High-Risk Anomalies",
      value: loading ? "—" : formatNumber(metrics.highRiskAnomalies),
      change: loading
        ? "—"
        : formatPercent(
            metrics.totalFacilities === 0 ? 0 : metrics.highRiskAnomalies / metrics.totalFacilities
          ),
      changeType: "negative",
    },
    {
      icon: <MapPinOff className="w-5 h-5 md:w-6 md:h-6 text-danger" />,
      label: "Medical Deserts",
      value: loading ? "—" : formatNumber(metrics.medicalDesertRegions),
      change: loading ? "—" : `${metrics.medicalDesertRegions} regions`,
      changeType: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      {metricCards.map((metric, i) => (
        <MetricCard key={i} {...metric} />
      ))}
    </div>
  );
};

export default MetricsRow;
