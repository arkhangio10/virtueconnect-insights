import { useState } from "react";
import { Activity, LayoutDashboard, Shield, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  activeView: "dashboard" | "patientsafe";
  onViewChange: (view: "dashboard" | "patientsafe") => void;
}

const AppSidebar = ({ activeView, onViewChange }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-foreground truncate">
            VirtueConnect
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5">
        <button
          onClick={() => onViewChange("dashboard")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeView === "dashboard"
              ? "bg-primary/10 text-primary card-glow"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>NGO Dashboard</span>}
        </button>

        <button
          onClick={() => onViewChange("patientsafe")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeView === "patientsafe"
              ? "bg-primary/10 text-primary card-glow"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Shield className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>PatientSafe</span>}
        </button>
      </nav>

      {/* System Status */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Activity className="w-3 h-3 text-success" />
              <span>System Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Last sync: 4 min ago
            </p>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
