import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Search, Filter, MapPinned } from "lucide-react";
import GoogleMapView from "./GoogleMapView";
import { useFacilitiesData } from "@/hooks/useFacilitiesData";

const categories = ["All", "Maternity", "Trauma", "Infrastructure"] as const;
type Category = (typeof categories)[number];

const statusFilters = ["All Status", "validated", "uncertain", "anomaly"] as const;
type StatusFilter = (typeof statusFilters)[number];

interface FacilityMarker {
  lat: number;
  lng: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: "Maternity" | "Trauma" | "Infrastructure";
  region: string;
  beds?: number | null;
  lastAudit?: string | null;
  specialties?: string[];
  facilityType?: string | null;
}

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
  const { markers, specialties, desertZones, loading, error } = useFacilitiesData();
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All Specialties");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("All Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<FacilityMarker | null>(null);

  const specialtyOptions = useMemo(
    () => ["All Specialties", ...specialties],
    [specialties]
  );

  // Derive unique regions from markers
  const regionOptions = useMemo(() => {
    const regions = new Set<string>();
    markers.forEach((m) => {
      if (m.region && m.region !== "Unknown") regions.add(m.region);
    });
    return ["All Regions", ...Array.from(regions).sort()];
  }, [markers]);

  const [selectedRegion, setSelectedRegion] = useState<string>("All Regions");

  // Main filter logic
  const filteredMarkers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return markers.filter((marker) => {
      // Category filter
      if (activeCategory !== "All" && marker.category !== activeCategory) return false;

      // Status filter
      if (selectedStatus !== "All Status" && marker.status !== selectedStatus) return false;

      // Region filter
      if (selectedRegion !== "All Regions" && marker.region !== selectedRegion) return false;

      // Specialty filter
      if (selectedSpecialty !== "All Specialties") {
        const hasSpecialty = (marker.specialties ?? []).some(
          (spec) => spec.toLowerCase().includes(selectedSpecialty.toLowerCase())
        );
        if (!hasSpecialty) return false;
      }

      // Text search (name, region, facilityType)
      if (query) {
        const searchable = [
          marker.name,
          marker.region,
          marker.facilityType ?? "",
          ...(marker.specialties ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [markers, activeCategory, selectedSpecialty, selectedStatus, selectedRegion, searchQuery]);

  const counts = {
    validated: filteredMarkers.filter((m) => m.status === "validated").length,
    uncertain: filteredMarkers.filter((m) => m.status === "uncertain").length,
    anomaly: filteredMarkers.filter((m) => m.status === "anomaly").length,
    total: filteredMarkers.length,
  };

  const handleMarkerClick = (marker: { name: string }) => {
    const found = filteredMarkers.find((m) => m.name === marker.name);
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

  const hasActiveFilters =
    activeCategory !== "All" ||
    selectedSpecialty !== "All Specialties" ||
    selectedStatus !== "All Status" ||
    selectedRegion !== "All Regions" ||
    searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setActiveCategory("All");
    setSelectedSpecialty("All Specialties");
    setSelectedStatus("All Status");
    setSelectedRegion("All Regions");
    setSearchQuery("");
    setSelectedMarker(null);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in shadow-sm">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-primary" />
              Facility Map
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {loading ? "Loading..." : `${markers.length} total · ${counts.total} shown`}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedMarker(null);
                }}
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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by facility name, region, or type..."
            className="w-full pl-9 pr-10 py-2 md:py-2.5 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

          {/* Region */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-xs text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Specialty */}
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-xs text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[180px]"
          >
            {specialtyOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-xs text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === "All Status" ? s : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-danger/30 bg-danger/5 text-xs text-danger font-medium hover:bg-danger/10 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Google Maps */}
      <div className="relative">
        {error && (
          <div className="absolute top-3 right-3 z-20 bg-danger/10 border border-danger/20 text-danger text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <GoogleMapView
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          selectedMarkerName={selectedMarker?.name ?? null}
          desertZones={desertZones}
        />

        {/* No results overlay */}
        {!loading && filteredMarkers.length === 0 && hasActiveFilters && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
            <div className="bg-card border border-border rounded-xl p-6 text-center shadow-lg max-w-xs">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No facilities found</p>
              <p className="text-xs text-muted-foreground mb-3">
                Try adjusting your filters or search query.
              </p>
              <button
                onClick={clearAllFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Selected Marker Detail Panel */}
        {selectedMarker && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 bg-card/95 border border-border rounded-xl p-4 shadow-xl backdrop-blur-md z-20 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0",
                    statusColors[selectedMarker.status]
                  )}
                />
                <h4 className="text-sm font-bold text-foreground truncate">
                  {selectedMarker.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedMarker(null)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Region</p>
                <p className="font-medium text-foreground">{selectedMarker.region}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <p
                  className={cn(
                    "font-medium capitalize",
                    statusText[selectedMarker.status]
                  )}
                >
                  {selectedMarker.status}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                <p className="font-medium text-foreground">{selectedMarker.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium text-foreground capitalize">
                  {selectedMarker.facilityType ?? "N/A"}
                </p>
              </div>
              {selectedMarker.specialties && selectedMarker.specialties.length > 0 && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedMarker.specialties.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                      >
                        {s}
                      </span>
                    ))}
                    {selectedMarker.specialties.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{selectedMarker.specialties.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Facility List Bar */}
      <div className="border-t border-border px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2 flex-shrink-0">
            Facilities:
          </span>
          {loading && (
            <span className="text-xs text-muted-foreground">Loading facilities...</span>
          )}
          {!loading && filteredMarkers.length === 0 && (
            <span className="text-xs text-muted-foreground">No facilities match filters.</span>
          )}
          {filteredMarkers.slice(0, 50).map((m) => (
            <button
              key={m.name}
              onClick={() =>
                setSelectedMarker(selectedMarker?.name === m.name ? null : m)
              }
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all whitespace-nowrap",
                selectedMarker?.name === m.name
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  statusColors[m.status]
                )}
              />
              {m.name}
            </button>
          ))}
          {filteredMarkers.length > 50 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              +{filteredMarkers.length - 50} more
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 md:gap-6 px-5 py-3.5 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-xs md:text-sm text-muted-foreground">
            Validated ({counts.validated})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-xs md:text-sm text-muted-foreground">
            Uncertain ({counts.uncertain})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="text-xs md:text-sm text-muted-foreground">
            Anomaly ({counts.anomaly})
          </span>
        </div>
        <div className="ml-auto text-xs md:text-sm font-mono text-muted-foreground">
          {counts.total} facilities
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
