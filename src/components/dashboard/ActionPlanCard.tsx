import { MapPin, AlertCircle, Users, Building, Stethoscope, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ActionPlanCard = () => {
  return (
    <div className="gradient-card rounded-xl border border-border p-5 card-glow-accent animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Action Plan</h3>
        <span className="text-[10px] font-mono bg-warning/10 text-warning px-2 py-0.5 rounded-full">
          Priority: High
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {/* Region */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Region</p>
            <p className="text-sm font-medium text-foreground">Northern Region</p>
          </div>
        </div>

        {/* Critical Gap */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-danger" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical Gap</p>
            <p className="text-sm font-medium text-foreground">Missing Ultrasound OB</p>
          </div>
        </div>

        {/* Impact */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impact</p>
            <p className="text-sm font-medium text-foreground">15,000 women without access &lt; 2h</p>
          </div>
        </div>

        {/* Candidate Facility */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Candidate Facility</p>
            <p className="text-sm font-medium text-foreground">Tamale Teaching Hospital</p>
          </div>
        </div>

        {/* Intervention */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Stethoscope className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Intervention</p>
            <p className="text-sm font-medium text-foreground">Deploy mobile OB ultrasound unit</p>
          </div>
        </div>

        {/* Cost-Effectiveness */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost-Effectiveness</p>
            <div className="flex items-center gap-2 mt-1">
              {["High", "Medium", "Low"].map((level) => (
                <span
                  key={level}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
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
