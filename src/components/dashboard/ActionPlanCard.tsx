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
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-card-foreground">Action Plan</h3>
        <span className="text-[10px] font-mono bg-warning/10 text-warning px-2.5 py-1 rounded-full font-medium">
          Priority: High
        </span>
      </div>

      <div className="space-y-3.5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <item.icon className={cn("w-4 h-4", item.iconClass)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
              <p className="text-xs font-medium text-card-foreground truncate">{item.value}</p>
            </div>
          </div>
        ))}

        {/* Cost-Effectiveness */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cost-Effectiveness</p>
            <div className="flex items-center gap-1.5 mt-1">
              {["High", "Medium", "Low"].map((level) => (
                <span
                  key={level}
                  className={cn(
                    "text-[9px] font-medium px-2 py-0.5 rounded-full",
                    level === "High"
                      ? "bg-success/12 text-success border border-success/20"
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
