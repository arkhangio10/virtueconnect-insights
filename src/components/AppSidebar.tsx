import { useState } from "react";
import { LayoutDashboard, Shield, ChevronLeft, ChevronRight } from "lucide-react";
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
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-56"
      )}
      style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-primary-foreground font-bold text-xs">VC</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
            VirtueConnect
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => onViewChange("dashboard")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeView === "dashboard"
              ? "bg-sidebar-primary/15 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
              ? "bg-sidebar-primary/15 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Shield className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>PatientSafe</span>}
        </button>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
