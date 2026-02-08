import { BarChart3, Target, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const commands = [
  { icon: <BarChart3 className="w-4 h-4" />, label: "Resource Distribution" },
  { icon: <Target className="w-4 h-4" />, label: "Cold Spots" },
  { icon: <FileCheck className="w-4 h-4" />, label: "Validation Report" },
];

const QuickCommands = () => {
  return (
    <div className="flex items-center gap-2">
      {commands.map((cmd) => (
        <button
          key={cmd.label}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/40",
            "hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-primary">{cmd.icon}</span>
          {cmd.label}
        </button>
      ))}
    </div>
  );
};

export default QuickCommands;
