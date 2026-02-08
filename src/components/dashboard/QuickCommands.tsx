import { BarChart3, Target, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const commands = [
  { icon: <BarChart3 className="w-5 h-5" />, label: "Resource Distribution", desc: "Analyze allocation" },
  { icon: <Target className="w-5 h-5" />, label: "Cold Spots", desc: "Medical deserts" },
  { icon: <FileCheck className="w-5 h-5" />, label: "Validation Report", desc: "Audit findings" },
];

const QuickCommands = () => {
  return (
    <div className="flex items-center gap-3">
      {commands.map((cmd) => (
        <button
          key={cmd.label}
          className={cn(
            "flex items-center gap-3 px-5 py-3.5 rounded-xl border border-border bg-card shadow-xs",
            "hover:border-primary/30 hover:shadow-sm transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-primary">{cmd.icon}</span>
          <div className="text-left">
            <span className="block text-sm font-semibold text-foreground">{cmd.label}</span>
            <span className="block text-xs text-muted-foreground">{cmd.desc}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default QuickCommands;
