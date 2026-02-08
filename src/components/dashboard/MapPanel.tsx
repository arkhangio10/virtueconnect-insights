import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Search } from "lucide-react";
import GoogleMapView from "./GoogleMapView";

const categories = ["Maternity", "Trauma", "Infrastructure"] as const;
type Category = (typeof categories)[number];

const specialties = [
  "All Specialties",
  "OB/GYN",
  "Emergency Medicine",
  "Pediatrics",
  "General Surgery",
  "Internal Medicine",
  "Cardiology",
  "Orthopedics",
] as const;

interface FacilityMarker {
  lat: number;
  lng: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: Category;
  region: string;
  beds: number;
  lastAudit: string;
}

const markers: FacilityMarker[] = [
  { lat: 9.40, lng: -0.84, status: "validated", name: "Tamale Teaching Hospital", category: "Maternity", region: "Northern", beds: 420, lastAudit: "2026-01-15" },
  { lat: 9.44, lng: -0.01, status: "anomaly", name: "Yendi Municipal Hospital", category: "Trauma", region: "Northern", beds: 85, lastAudit: "2025-11-02" },
  { lat: 6.69, lng: -1.62, status: "validated", name: "Kumasi South Hospital", category: "Maternity", region: "Ashanti", beds: 310, lastAudit: "2026-02-01" },
  { lat: 6.73, lng: -1.45, status: "uncertain", name: "Ejisu Clinic", category: "Infrastructure", region: "Ashanti", beds: 45, lastAudit: "2025-09-18" },
  { lat: 5.54, lng: -0.23, status: "validated", name: "Korle Bu Teaching Hospital", category: "Maternity", region: "Greater Accra", beds: 1600, lastAudit: "2026-01-28" },
  { lat: 5.56, lng: -0.19, status: "validated", name: "Ridge Hospital", category: "Trauma", region: "Greater Accra", beds: 450, lastAudit: "2026-01-20" },
  { lat: 6.60, lng: 0.47, status: "anomaly", name: "Ho Municipal Hospital", category: "Infrastructure", region: "Volta", beds: 120, lastAudit: "2025-10-05" },
  { lat: 7.34, lng: -2.33, status: "uncertain", name: "Sunyani Regional Hospital", category: "Maternity", region: "Bono", beds: 200, lastAudit: "2025-12-10" },
  { lat: 5.10, lng: -1.25, status: "validated", name: "Cape Coast Hospital", category: "Trauma", region: "Central", beds: 380, lastAudit: "2026-01-05" },
  { lat: 8.06, lng: -1.73, status: "anomaly", name: "Kintampo Health Center", category: "Infrastructure", region: "Bono East", beds: 60, lastAudit: "2025-08-22" },
  { lat: 10.79, lng: -0.85, status: "validated", name: "Bolgatanga Hospital", category: "Maternity", region: "Upper East", beds: 160, lastAudit: "2025-12-28" },
  { lat: 5.67, lng: 0.02, status: "validated", name: "Tema General Hospital", category: "Trauma", region: "Greater Accra", beds: 300, lastAudit: "2026-02-03" },
  { lat: 4.93, lng: -1.76, status: "uncertain", name: "Takoradi Hospital", category: "Infrastructure", region: "Western", beds: 240, lastAudit: "2025-11-15" },
  { lat: 7.59, lng: -1.94, status: "validated", name: "Techiman Holy Family", category: "Maternity", region: "Bono East", beds: 280, lastAudit: "2026-01-10" },
];

const statusColors = {
  validated: "bg-success",
  uncertain: "bg-warning",
  anomaly: "bg-danger",
};

const statusText = {
  validated: "text-success",
  uncertain: "text-warning",
  anomaly: "text-danger",
};

const MapPanel = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("Maternity");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All Specialties");
  const [selectedMarker, setSelectedMarker] = useState<FacilityMarker | null>(null);

  const filteredMarkers = markers.filter((m) => m.category === activeCategory);

  const counts = {
    validated: filteredMarkers.filter((m) => m.status === "validated").length,
    uncertain: filteredMarkers.filter((m) => m.status === "uncertain").length,
    anomaly: filteredMarkers.filter((m) => m.status === "anomaly").length,
  };

  const handleMarkerClick = (marker: { name: string }) => {
    const found = markers.find((m) => m.name === marker.name);
    if (found) {
      setSelectedMarker(selectedMarker?.name === found.name ? null : found);
    }
  };

  const mapMarkers = filteredMarkers.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    status: m.status,
    name: m.name,
    category: m.category,
    region: m.region,
    beds: m.beds,
    lastAudit: m.lastAudit,
  }));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in shadow-sm">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-foreground">Facility Map — Ghana</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Drag to pan · Scroll to zoom · Click markers
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedMarker(null); }}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all text-center",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Specialty Filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full pl-9 pr-4 py-2 md:py-2.5 rounded-lg border border-border bg-secondary text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {specialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Google Maps */}
      <div className="relative">
        <GoogleMapView
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          selectedMarkerName={selectedMarker?.name ?? null}
        />

        {/* Selected Marker Detail Panel */}
        {selectedMarker && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 bg-card/95 border border-border rounded-xl p-4 shadow-xl backdrop-blur-md z-20 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", statusColors[selectedMarker.status])} />
                <h4 className="text-base font-bold text-foreground">{selectedMarker.name}</h4>
              </div>
              <button onClick={() => setSelectedMarker(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium text-foreground">{selectedMarker.region}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className={cn("font-medium capitalize", statusText[selectedMarker.status])}>{selectedMarker.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bed Capacity</p>
                <p className="font-medium text-foreground">{selectedMarker.beds}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Audit</p>
                <p className="font-medium text-foreground">{selectedMarker.lastAudit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium text-foreground">{selectedMarker.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Coordinates</p>
                <p className="font-mono text-foreground">{selectedMarker.lat.toFixed(2)}°, {selectedMarker.lng.toFixed(2)}°</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Facility List Bar */}
      <div className="border-t border-border px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2 flex-shrink-0">Facilities:</span>
          {filteredMarkers.map((m) => (
            <button
              key={m.name}
              onClick={() => setSelectedMarker(selectedMarker?.name === m.name ? null : m)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all whitespace-nowrap",
                selectedMarker?.name === m.name
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors[m.status])} />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 md:gap-6 px-5 py-3.5 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-xs md:text-sm text-muted-foreground">Validated ({counts.validated})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-xs md:text-sm text-muted-foreground">Uncertain ({counts.uncertain})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="text-xs md:text-sm text-muted-foreground">Anomaly ({counts.anomaly})</span>
        </div>
        <div className="ml-auto text-xs md:text-sm font-mono text-muted-foreground">
          {filteredMarkers.length} facilities
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
