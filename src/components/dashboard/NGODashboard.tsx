import MetricsRow from "./MetricsRow";
import MapPanel from "./MapPanel";
import ActionPlanCard from "./ActionPlanCard";
import QuickCommands from "./QuickCommands";

const NGODashboard = () => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">NGO Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Forensic truth layer — healthcare facility capabilities in Ghana
        </p>
      </div>

      {/* Metrics */}
      <MetricsRow />

      {/* Map + Action Plan */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <MapPanel />
        </div>
        <div>
          <ActionPlanCard />
        </div>
      </div>

      {/* Quick Commands */}
      <QuickCommands />
    </div>
  );
};

export default NGODashboard;
