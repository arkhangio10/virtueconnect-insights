import { MapPin, AlertCircle, Users, Building, Stethoscope, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: MapPin, iconClass: "text-primary", label: "Region", value: "Northern Region" },
  { icon: AlertCircle, iconClass: "text-danger", label: "Critical Gap", value: "Missing Ultrasound OB" },
  { icon: Users, iconClass: "text-warning", label: "Impact", value: "15,000 women < 2h access" },
  { icon: Building, iconClass: "text-primary", label: "Candidate", value: "Tamale Teaching Hospital" },
  { icon: Stethoscope, iconClass: "text-success", label: "Intervention", value: "Deploy mobile OB unit" },
];

const ActionPlanCard = () => {
  return (
    <div className="gradient-card rounded-xl border border-border p-4 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Action Plan</h3>
        <span className="text-[10px] font-mono bg-warning/10 text-warning px-2 py-0.5 rounded-full">
          Priority: High
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
              <item.icon className={cn("w-3.5 h-3.5", item.iconClass)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
            </div>
          </div>
        ))}

        {/* Cost-Effectiveness */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-success/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost-Effectiveness</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {["High", "Medium", "Low"].map((level) => (
                <span
                  key={level}
                  className={cn(
                    "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                    level === "High"
                      ? "bg-success/15 text-success border border-success/20"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {level}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPlanCard;
