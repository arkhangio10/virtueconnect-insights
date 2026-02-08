import MetricsRow from "./MetricsRow";
import MapPanel from "./MapPanel";
import ActionPlanCard from "./ActionPlanCard";
import QuickCommands from "./QuickCommands";
import VoiceChatButton from "./VoiceChatButton";

const NGODashboard = () => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">NGO Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Forensic truth layer — healthcare facility capabilities in Ghana
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live · 4,218 facilities
        </div>
      </div>

      {/* Metrics */}
      <MetricsRow />

      {/* Quick Commands */}
      <QuickCommands />

      {/* Map + Action Plan - better distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <MapPanel />
        </div>
        <div className="lg:col-span-2">
          <ActionPlanCard />
        </div>
      </div>

      {/* Voice Chat FAB */}
      <VoiceChatButton />
    </div>
  );
};

export default NGODashboard;
