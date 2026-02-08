import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Locate, Info, X } from "lucide-react";
import ghanaMap from "@/assets/ghana-map.jpg";

const categories = ["Maternity", "Trauma", "Infrastructure"] as const;
type Category = (typeof categories)[number];

interface FacilityMarker {
  x: number;
  y: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: Category;
  region: string;
  beds: number;
  lastAudit: string;
}

const markers: FacilityMarker[] = [
  { x: 45, y: 25, status: "validated", name: "Tamale Teaching Hospital", category: "Maternity", region: "Northern", beds: 420, lastAudit: "2026-01-15" },
  { x: 48, y: 30, status: "anomaly", name: "Yendi Municipal Hospital", category: "Trauma", region: "Northern", beds: 85, lastAudit: "2025-11-02" },
  { x: 50, y: 55, status: "validated", name: "Kumasi South Hospital", category: "Maternity", region: "Ashanti", beds: 310, lastAudit: "2026-02-01" },
  { x: 55, y: 50, status: "uncertain", name: "Ejisu Clinic", category: "Infrastructure", region: "Ashanti", beds: 45, lastAudit: "2025-09-18" },
  { x: 52, y: 75, status: "validated", name: "Korle Bu Teaching Hospital", category: "Maternity", region: "Greater Accra", beds: 1600, lastAudit: "2026-01-28" },
  { x: 48, y: 72, status: "validated", name: "Ridge Hospital", category: "Trauma", region: "Greater Accra", beds: 450, lastAudit: "2026-01-20" },
  { x: 60, y: 65, status: "anomaly", name: "Ho Municipal Hospital", category: "Infrastructure", region: "Volta", beds: 120, lastAudit: "2025-10-05" },
  { x: 35, y: 45, status: "uncertain", name: "Sunyani Regional Hospital", category: "Maternity", region: "Bono", beds: 200, lastAudit: "2025-12-10" },
  { x: 40, y: 60, status: "validated", name: "Cape Coast Hospital", category: "Trauma", region: "Central", beds: 380, lastAudit: "2026-01-05" },
  { x: 55, y: 38, status: "anomaly", name: "Kintampo Health Center", category: "Infrastructure", region: "Bono East", beds: 60, lastAudit: "2025-08-22" },
  { x: 42, y: 35, status: "validated", name: "Bolgatanga Hospital", category: "Maternity", region: "Upper East", beds: 160, lastAudit: "2025-12-28" },
  { x: 58, y: 80, status: "validated", name: "Tema General Hospital", category: "Trauma", region: "Greater Accra", beds: 300, lastAudit: "2026-02-03" },
  { x: 38, y: 68, status: "uncertain", name: "Takoradi Hospital", category: "Infrastructure", region: "Western", beds: 240, lastAudit: "2025-11-15" },
  { x: 47, y: 42, status: "validated", name: "Techiman Holy Family", category: "Maternity", region: "Bono East", beds: 280, lastAudit: "2026-01-10" },
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

const statusText = {
  validated: "text-success",
  uncertain: "text-warning",
  anomaly: "text-danger",
};

const MapPanel = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("Maternity");
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<FacilityMarker | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const filteredMarkers = markers.filter((m) => m.category === activeCategory);

  const counts = {
    validated: filteredMarkers.filter((m) => m.status === "validated").length,
    uncertain: filteredMarkers.filter((m) => m.status === "uncertain").length,
    anomaly: filteredMarkers.filter((m) => m.status === "anomaly").length,
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 1));
  const handleReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedMarker(null);
  };

  const handleMarkerClick = (marker: FacilityMarker) => {
    setSelectedMarker(selectedMarker?.name === marker.name ? null : marker);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [zoom, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.15, 3));
    } else {
      setZoom((z) => {
        const newZoom = Math.max(z - 0.15, 1);
        if (newZoom === 1) setPanOffset({ x: 0, y: 0 });
        return newZoom;
      });
    }
  }, []);

  const focusOnMarker = (marker: FacilityMarker) => {
    setZoom(2);
    setPanOffset({
      x: -(marker.x - 50) * 4,
      y: -(marker.y - 50) * 3,
    });
    setSelectedMarker(marker);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Facility Map — Ghana</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click markers to inspect · Scroll to zoom · Drag to pan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedMarker(null); }}
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
      </div>

      {/* Map Area */}
      <div className="relative">
        <div
          className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="w-full h-full transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={ghanaMap}
              alt="Ghana healthcare facility map"
              className="w-full h-full object-cover opacity-80 select-none pointer-events-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-primary/5" />

            {/* Markers */}
            {filteredMarkers.map((marker) => (
              <div
                key={marker.name}
                className="absolute group"
                style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -50%)" }}
                onMouseEnter={() => setHoveredMarker(marker.name)}
                onMouseLeave={() => setHoveredMarker(null)}
                onClick={(e) => { e.stopPropagation(); handleMarkerClick(marker); }}
              >
                {/* Pulse ring for selected */}
                {selectedMarker?.name === marker.name && (
                  <div className={cn(
                    "absolute inset-0 w-5 h-5 -translate-x-1 -translate-y-1 rounded-full animate-ping opacity-40",
                    statusColors[marker.status]
                  )} />
                )}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full ring-4 cursor-pointer transition-all duration-300 relative z-10",
                    statusColors[marker.status],
                    statusRing[marker.status],
                    (hoveredMarker === marker.name || selectedMarker?.name === marker.name) && "scale-150",
                    selectedMarker?.name === marker.name && "ring-8"
                  )}
                />
                {/* Hover Tooltip */}
                {hoveredMarker === marker.name && selectedMarker?.name !== marker.name && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-20 whitespace-nowrap animate-fade-in">
                    <p className="text-xs font-medium text-foreground">{marker.name}</p>
                    <p className={cn("text-[10px] font-medium capitalize mt-0.5", statusText[marker.status])}>
                      {marker.status} · {marker.region}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
            <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors backdrop-blur-sm">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors backdrop-blur-sm">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="w-8 h-8 rounded-lg bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors backdrop-blur-sm">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom level badge */}
          {zoom > 1 && (
            <div className="absolute top-3 left-3 bg-card/90 border border-border rounded-lg px-2.5 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-sm z-20">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Selected Marker Detail Panel */}
        {selectedMarker && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 bg-card/95 border border-border rounded-xl p-4 shadow-xl backdrop-blur-md z-20 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[selectedMarker.status])} />
                <h4 className="text-sm font-semibold text-foreground">{selectedMarker.name}</h4>
              </div>
              <button onClick={() => setSelectedMarker(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
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
                <p className="font-mono text-foreground">{selectedMarker.x}°, {selectedMarker.y}°</p>
              </div>
            </div>
            <button
              onClick={() => focusOnMarker(selectedMarker)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Locate className="w-3.5 h-3.5" />
              Focus & Zoom
            </button>
          </div>
        )}
      </div>

      {/* Facility List Bar */}
      <div className="border-t border-border px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 flex-shrink-0">Facilities:</span>
          {filteredMarkers.map((m) => (
            <button
              key={m.name}
              onClick={() => focusOnMarker(m)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all whitespace-nowrap",
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
        <div className="ml-auto text-[10px] font-mono text-muted-foreground/60">
          {filteredMarkers.length} facilities
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
