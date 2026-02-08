import MetricsRow from "./MetricsRow";
import MapPanel from "./MapPanel";
import ActionPlanCard from "./ActionPlanCard";
import QuickCommands from "./QuickCommands";
import VoiceChatButton from "./VoiceChatButton";

const NGODashboard = () => {
  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">NGO Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Healthcare facility capabilities — Ghana
        </p>
      </div>

      {/* Metrics */}
      <MetricsRow />

      {/* Map + Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <MapPanel />
        </div>
        <div className="lg:col-span-2">
          <ActionPlanCard />
        </div>
      </div>

      {/* Quick Commands */}
      <QuickCommands />

      {/* Voice Chat FAB */}
      <VoiceChatButton />
    </div>
  );
};

export default NGODashboard;
