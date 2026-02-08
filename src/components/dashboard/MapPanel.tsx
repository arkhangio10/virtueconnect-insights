import { useState } from "react";
import { cn } from "@/lib/utils";
import ghanaMap from "@/assets/ghana-map.jpg";

const categories = ["Maternity", "Trauma", "Infrastructure"] as const;
type Category = typeof categories[number];

interface FacilityMarker {
  x: number;
  y: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: Category;
}

const markers: FacilityMarker[] = [
  { x: 45, y: 25, status: "validated", name: "Tamale Teaching Hospital", category: "Maternity" },
  { x: 48, y: 30, status: "anomaly", name: "Yendi Municipal Hospital", category: "Trauma" },
  { x: 50, y: 55, status: "validated", name: "Kumasi South Hospital", category: "Maternity" },
  { x: 55, y: 50, status: "uncertain", name: "Ejisu Clinic", category: "Infrastructure" },
  { x: 52, y: 75, status: "validated", name: "Korle Bu Teaching Hospital", category: "Maternity" },
  { x: 48, y: 72, status: "validated", name: "Ridge Hospital", category: "Trauma" },
  { x: 60, y: 65, status: "anomaly", name: "Ho Municipal Hospital", category: "Infrastructure" },
  { x: 35, y: 45, status: "uncertain", name: "Sunyani Regional Hospital", category: "Maternity" },
  { x: 40, y: 60, status: "validated", name: "Cape Coast Hospital", category: "Trauma" },
  { x: 55, y: 38, status: "anomaly", name: "Kintampo Health Center", category: "Infrastructure" },
  { x: 42, y: 35, status: "validated", name: "Bolgatanga Hospital", category: "Maternity" },
  { x: 58, y: 80, status: "validated", name: "Tema General Hospital", category: "Trauma" },
  { x: 38, y: 68, status: "uncertain", name: "Takoradi Hospital", category: "Infrastructure" },
  { x: 47, y: 42, status: "validated", name: "Techiman Holy Family", category: "Maternity" },
];

const statusColors = {
  validated: "bg-success",
  uncertain: "bg-warning",
  anomaly: "bg-danger",
};

const statusRing = {
  validated: "ring-success/30",
  uncertain: "ring-warning/30",
  anomaly: "ring-danger/30",
};

const MapPanel = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("Maternity");
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const filteredMarkers = markers.filter((m) => m.category === activeCategory);

  const counts = {
    validated: filteredMarkers.filter((m) => m.status === "validated").length,
    uncertain: filteredMarkers.filter((m) => m.status === "uncertain").length,
    anomaly: filteredMarkers.filter((m) => m.status === "anomaly").length,
  };

  return (
    <div className="gradient-card rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Facility Map — Ghana</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time facility validation layer
          </p>
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
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

      {/* Map */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
        <img
          src={ghanaMap}
          alt="Ghana healthcare facility map"
          className="w-full h-full object-cover opacity-80"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/30" />

        {/* Markers */}
        {filteredMarkers.map((marker) => (
          <div
            key={marker.name}
            className="absolute group"
            style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -50%)" }}
            onMouseEnter={() => setHoveredMarker(marker.name)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full ring-4 cursor-pointer transition-all duration-300",
                statusColors[marker.status],
                statusRing[marker.status],
                hoveredMarker === marker.name && "scale-150"
              )}
            />
            {hoveredMarker === marker.name && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap animate-fade-in">
                <p className="text-xs font-medium text-foreground">{marker.name}</p>
                <p className={cn(
                  "text-[10px] font-medium capitalize mt-0.5",
                  marker.status === "validated" && "text-success",
                  marker.status === "uncertain" && "text-warning",
                  marker.status === "anomaly" && "text-danger",
                )}>
                  {marker.status}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground">Validated ({counts.validated})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-[10px] text-muted-foreground">Uncertain ({counts.uncertain})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-danger" />
          <span className="text-[10px] text-muted-foreground">Anomaly ({counts.anomaly})</span>
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
