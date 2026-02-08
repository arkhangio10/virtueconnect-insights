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
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-card-foreground">Action Plan</h3>
        <span className="text-xs font-mono bg-warning/12 text-warning px-3 py-1.5 rounded-full font-semibold border border-warning/20">
          Priority: High
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <item.icon className={cn("w-5 h-5", item.iconClass)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
              <p className="text-sm font-medium text-card-foreground mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}

        {/* Cost-Effectiveness */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cost-Effectiveness</p>
            <div className="flex items-center gap-2 mt-1.5">
              {["High", "Medium", "Low"].map((level) => (
                <span
                  key={level}
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full",
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
