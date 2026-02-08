import { useState } from "react";
import { LayoutDashboard, Shield, ChevronLeft, ChevronRight, Activity, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  activeView: "dashboard" | "patientsafe";
  onViewChange: (view: "dashboard" | "patientsafe") => void;
}

const AppSidebar = ({ activeView, onViewChange }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleViewChange = (view: "dashboard" | "patientsafe") => {
    onViewChange(view);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-primary-foreground font-bold text-sm">VC</span>
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="min-w-0 flex-1">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground block">
              VirtueConnect
            </span>
            <span className="text-xs text-sidebar-foreground/50">Ghana Health Platform</span>
          </div>
        )}
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status */}
      {(!collapsed || mobileOpen) && (
        <div className="mx-4 mt-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <Activity className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <span className="text-xs font-medium text-success">System Active</span>
          <span className="text-[10px] font-mono text-sidebar-foreground/40 ml-auto">v2.1</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 mt-2">
        <button
          onClick={() => handleViewChange("dashboard")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all duration-200",
            activeView === "dashboard"
              ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && (
            <div className="text-left min-w-0">
              <span className="block">Dashboard</span>
              <span className="text-[11px] opacity-60 block">Mapa y métricas</span>
            </div>
          )}
        </button>

        <button
          onClick={() => handleViewChange("patientsafe")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all duration-200",
            activeView === "patientsafe"
              ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Shield className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && (
            <div className="text-left min-w-0">
              <span className="block">PatientSafe</span>
              <span className="text-[11px] opacity-60 block">Consulta clínica</span>
            </div>
          )}
        </button>
      </nav>

      {/* Footer */}
      {(!collapsed || mobileOpen) && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-[11px] text-sidebar-foreground/40 leading-relaxed">
            Forensic health data layer for healthcare professionals in Ghana.
          </p>
        </div>
      )}

      {/* Collapse Toggle - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 border-b border-border"
        style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-xs">VC</span>
        </div>
        <span className="text-sm font-bold text-sidebar-foreground">VirtueConnect</span>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
          collapsed ? "w-[72px]" : "w-64"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
