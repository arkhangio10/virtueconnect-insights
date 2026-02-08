import { useState, useMemo } from "react";
import { BarChart3, Target, FileCheck, X, MapPin, AlertTriangle, CheckCircle2, Building2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFacilitiesData } from "@/hooks/useFacilitiesData";

type ModalType = "distribution" | "coldspots" | "validation" | null;

const commands = [
  { id: "distribution" as const, icon: <BarChart3 className="w-5 h-5" />, label: "Resource Distribution", desc: "Analyze allocation" },
  { id: "coldspots" as const, icon: <Target className="w-5 h-5" />, label: "Cold Spots", desc: "Medical deserts" },
  { id: "validation" as const, icon: <FileCheck className="w-5 h-5" />, label: "Validation Report", desc: "Audit findings" },
];

// ── Resource Distribution analysis ──────────────────────────────────────────
function ResourceDistribution({ facilities }: { facilities: any[] }) {
  const regionStats = useMemo(() => {
    const map = new Map<string, { total: number; csection: number; blood: number; emergency: number; beds: number }>();
    facilities.forEach((f) => {
      const region = f.region || "Unknown";
      const entry = map.get(region) || { total: 0, csection: 0, blood: 0, emergency: 0, beds: 0 };
      entry.total++;
      if (f.maternity?.c_section?.value === true) entry.csection++;
      if (f.maternity?.blood_bank?.value === true) entry.blood++;
      if (f.trauma?.emergency_24_7?.value === true) entry.emergency++;
      entry.beds += f.infrastructure?.beds_inpatient?.value ?? 0;
      map.set(region, entry);
    });
    return Array.from(map.entries())
      .map(([region, stats]) => ({ region, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [facilities]);

  const maxTotal = Math.max(...regionStats.map((r) => r.total), 1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Distribution of {facilities.length} facilities across {regionStats.length} regions, showing key capability coverage.
      </p>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {regionStats.map((r) => (
          <div key={r.region} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{r.region}</span>
              <span className="text-xs text-muted-foreground font-mono">{r.total} facilities</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                style={{ width: `${(r.total / maxTotal) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-success" /> C-Section: {r.csection}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-danger" /> Blood Bank: {r.blood}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-warning" /> 24/7 ER: {r.emergency}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-primary" /> Beds: {r.beds}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cold Spots (Medical Deserts) analysis ───────────────────────────────────
function ColdSpots({ facilities }: { facilities: any[] }) {
  const deserts = useMemo(() => {
    const regionMap = new Map<string, {
      total: number;
      csection: number;
      blood: number;
      emergency: number;
      facilities: string[];
    }>();
    facilities.forEach((f) => {
      const region = f.region || "Unknown";
      const entry = regionMap.get(region) || { total: 0, csection: 0, blood: 0, emergency: 0, facilities: [] };
      entry.total++;
      if (f.maternity?.c_section?.value === true) entry.csection++;
      if (f.maternity?.blood_bank?.value === true) entry.blood++;
      if (f.trauma?.emergency_24_7?.value === true) entry.emergency++;
      entry.facilities.push(f.name);
      regionMap.set(region, entry);
    });

    return Array.from(regionMap.entries())
      .map(([region, stats]) => {
        const gaps: string[] = [];
        if (stats.csection === 0) gaps.push("No C-Section capability");
        if (stats.blood === 0) gaps.push("No Blood Bank");
        if (stats.emergency === 0) gaps.push("No 24/7 Emergency");
        const severity = gaps.length >= 3 ? "critical" : gaps.length >= 2 ? "high" : gaps.length >= 1 ? "moderate" : "low";
        return { region, ...stats, gaps, severity };
      })
      .filter((r) => r.gaps.length > 0)
      .sort((a, b) => b.gaps.length - a.gaps.length);
  }, [facilities]);

  const sevColors: Record<string, string> = {
    critical: "bg-danger/15 text-danger border-danger/30",
    high: "bg-warning/15 text-warning border-warning/30",
    moderate: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800",
    low: "bg-success/15 text-success border-success/30",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {deserts.length} region{deserts.length !== 1 ? "s" : ""} with critical capability gaps identified as potential medical deserts.
      </p>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {deserts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success" />
            <p className="font-semibold">No critical medical deserts detected</p>
          </div>
        ) : (
          deserts.map((d) => (
            <div key={d.region} className={cn("rounded-xl border p-4", sevColors[d.severity])}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-bold text-sm">{d.region}</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-background/50">
                  {d.severity}
                </span>
              </div>
              <div className="text-xs space-y-1 mb-2">
                {d.gaps.map((gap) => (
                  <div key={gap} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] opacity-70">
                {d.total} facilities in region — Coverage gaps affect all {d.total} facilities
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Validation Report ───────────────────────────────────────────────────────
function ValidationReport({ facilities }: { facilities: any[] }) {
  const report = useMemo(() => {
    let totalAnomalies = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    const anomalyTypes = new Map<string, number>();
    const regionAnomalies = new Map<string, number>();
    const topAnomalyFacilities: { name: string; region: string; count: number; types: string[] }[] = [];

    facilities.forEach((f) => {
      const anomalies = f.anomalies ?? [];
      if (anomalies.length === 0) return;
      totalAnomalies += anomalies.length;

      const types: string[] = [];
      anomalies.forEach((a: any) => {
        const sev = (a.severity || "").toUpperCase();
        if (sev === "HIGH" || sev === "CRITICAL") highSeverity++;
        else if (sev === "MEDIUM" || sev === "MODERATE") mediumSeverity++;
        else lowSeverity++;

        const type = a.anomaly_type || a.bundle_name || "Unknown";
        types.push(type);
        anomalyTypes.set(type, (anomalyTypes.get(type) || 0) + 1);
      });

      const region = f.region || "Unknown";
      regionAnomalies.set(region, (regionAnomalies.get(region) || 0) + anomalies.length);

      topAnomalyFacilities.push({ name: f.name, region, count: anomalies.length, types: [...new Set(types)] });
    });

    topAnomalyFacilities.sort((a, b) => b.count - a.count);

    return {
      totalAnomalies,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      facilitiesWithAnomalies: topAnomalyFacilities.length,
      cleanFacilities: facilities.length - topAnomalyFacilities.length,
      anomalyTypes: Array.from(anomalyTypes.entries()).sort((a, b) => b[1] - a[1]),
      regionAnomalies: Array.from(regionAnomalies.entries()).sort((a, b) => b[1] - a[1]),
      topFacilities: topAnomalyFacilities.slice(0, 10),
    };
  }, [facilities]);

  const validationRate = facilities.length > 0
    ? ((report.cleanFacilities / facilities.length) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-success">{validationRate}%</div>
          <div className="text-[11px] text-muted-foreground">Clean Rate</div>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-danger">{report.highSeverity}</div>
          <div className="text-[11px] text-muted-foreground">High Severity</div>
        </div>
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-warning">{report.mediumSeverity}</div>
          <div className="text-[11px] text-muted-foreground">Medium</div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-primary">{report.totalAnomalies}</div>
          <div className="text-[11px] text-muted-foreground">Total Anomalies</div>
        </div>
      </div>

      {/* Anomaly types */}
      {report.anomalyTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-warning" /> Anomaly Types
          </h4>
          <div className="space-y-1.5">
            {report.anomalyTypes.slice(0, 8).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[70%]">{type}</span>
                <span className="font-mono font-bold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top flagged facilities */}
      {report.topFacilities.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" /> Most Flagged Facilities
          </h4>
          <div className="space-y-2">
            {report.topFacilities.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-xs bg-secondary/50 rounded-lg p-2.5 border border-border">
                <span className="font-bold text-danger bg-danger/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px]">
                  {f.count}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{f.name}</p>
                  <p className="text-muted-foreground">{f.region} — {f.types.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Region breakdown */}
      {report.regionAnomalies.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Anomalies by Region
          </h4>
          <div className="space-y-1.5">
            {report.regionAnomalies.map(([region, count]) => (
              <div key={region} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{region}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-danger/60 rounded-full"
                      style={{ width: `${(count / report.totalAnomalies) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-foreground w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
const modalTitles: Record<string, string> = {
  distribution: "Resource Distribution Analysis",
  coldspots: "Medical Desert Detection",
  validation: "Data Validation Report",
};

const QuickCommands = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { facilities } = useFacilitiesData();

  return (
    <>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {commands.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => setActiveModal(cmd.id)}
            className={cn(
              "flex items-center gap-3 px-4 md:px-5 py-3 md:py-3.5 rounded-xl border border-border bg-card shadow-xs min-w-[180px] md:min-w-0 flex-shrink-0 md:flex-shrink",
              "hover:border-primary/30 hover:shadow-sm transition-all text-sm font-medium text-muted-foreground hover:text-foreground active:scale-[0.98]"
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

      {/* Modal overlay */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-[95vw] md:w-[640px] max-h-[85vh] overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                {commands.find((c) => c.id === activeModal)?.icon}
                <h3 className="text-base md:text-lg font-bold text-foreground">
                  {modalTitles[activeModal]}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6">
              {activeModal === "distribution" && <ResourceDistribution facilities={facilities} />}
              {activeModal === "coldspots" && <ColdSpots facilities={facilities} />}
              {activeModal === "validation" && <ValidationReport facilities={facilities} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickCommands;
