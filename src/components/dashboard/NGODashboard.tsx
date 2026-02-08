import MetricsRow from "./MetricsRow";
import MapPanel from "./MapPanel";
import ActionPlanCard from "./ActionPlanCard";
import QuickCommands from "./QuickCommands";
import VoiceChatButton from "./VoiceChatButton";

const NGODashboard = () => {
  return (
    <div className="space-y-5 md:space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Healthcare Facility Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1.5 md:mt-2 max-w-2xl leading-relaxed">
          Forensic data layer — Interactive map, capability tracking, and anomaly detection across Ghana's healthcare network.
        </p>
      </div>

      {/* Metrics */}
      <MetricsRow />

      {/* Map + Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        <div className="lg:col-span-3">
          <MapPanel />
        </div>
        <div className="lg:col-span-2">
          <ActionPlanCard />
        </div>
      </div>

      {/* Quick Commands — below map */}
      <QuickCommands />

      {/* Voice Chat FAB */}
      <VoiceChatButton />
    </div>
  );
};

export default NGODashboard;
