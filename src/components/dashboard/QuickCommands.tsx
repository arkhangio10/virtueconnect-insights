import { BarChart3, Target, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const commands = [
  {
    icon: <BarChart3 className="w-4 h-4" />,
    label: "Resource Distribution",
    description: "Analyze allocation across regions",
  },
  {
    icon: <Target className="w-4 h-4" />,
    label: "Cold Spots",
    description: "Identify underserved areas",
  },
  {
    icon: <FileCheck className="w-4 h-4" />,
    label: "Validation Report",
    description: "Generate compliance report",
  },
];

const QuickCommands = () => {
  return (
    <div className="gradient-card rounded-xl border border-border p-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-3">Quick Commands</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {commands.map((cmd) => (
          <button
            key={cmd.label}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40",
              "hover:border-primary/40 hover:bg-primary/5 transition-all duration-200",
              "text-left group"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              {cmd.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{cmd.label}</p>
              <p className="text-[10px] text-muted-foreground">{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickCommands;
