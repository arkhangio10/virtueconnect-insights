import { useState, useCallback, useMemo, useEffect } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF } from "@react-google-maps/api";
import { cn } from "@/lib/utils";
import { Map, Satellite, Mountain, Layers, LocateFixed, Loader2 } from "lucide-react";

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? "";

// Default center (Ghana)
const DEFAULT_CENTER = { lat: 7.95, lng: -1.03 };

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f0f4f8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a6a8a" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4B92DB" }, { weight: 1.5 }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#a0c4e8" }, { weight: 0.8 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#2c5282" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c6ddf0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4B92DB" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8f0e8" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e8eef4" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f0f4f8" }] },
];

export interface MapMarker {
  lat: number;
  lng: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: string;
  region: string;
  beds?: number | null;
  lastAudit?: string | null;
}

export interface PatientLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface GoogleMapViewProps {
  markers: MapMarker[];
  selectedMarkerName?: string | null;
  onMarkerClick?: (marker: MapMarker) => void;
  patientLocation?: PatientLocation | null;
  /** When true, clicking the map sets a patient pin instead of selecting markers */
  mapClickMode?: boolean;
  /** Called when user clicks the map in mapClickMode or drags the patient pin */
  onMapClickLocation?: (loc: { lat: number; lng: number }) => void;
  /** Map of facility name → rank number (1, 2, 3...) for recommended facilities */
  rankMap?: Map<string, number>;
  /** Medical desert zones to overlay on the map */
  desertZones?: DesertZone[];
}

export interface DesertZone {
  lat: number;
  lng: number;
  radius: number; // meters
  severity: "critical" | "high" | "moderate";
  region: string;
  gaps: string[];
}

const statusPinColors: Record<string, string> = {
  validated: "#22c55e",
  uncertain: "#eab308",
  anomaly: "#ef4444",
};

const statusDotClasses: Record<string, string> = {
  validated: "bg-success",
  uncertain: "bg-warning",
  anomaly: "bg-danger",
};

function createMarkerIcon(status: string, isSelected: boolean): google.maps.Symbol {
  const color = statusPinColors[status] || "#999";
  const scale = isSelected ? 12 : 8;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: isSelected ? 1 : 0.85,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 2.5 : 1.5,
    scale,
  };
}

/** Creates a numbered pin SVG data URL for ranked facilities */
function createRankedMarkerUrl(rank: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.13 18 28 18 28s18-14.87 18-28C36 8.06 27.94 0 18 0z" fill="%230ea5e9" stroke="%23ffffff" stroke-width="2"/>
    <circle cx="18" cy="17" r="12" fill="%23ffffff"/>
    <text x="18" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="15" fill="%230ea5e9">${rank}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

const mapTypeOptions = [
  { id: "roadmap", label: "Mapa", icon: Map },
  { id: "satellite", label: "Satélite", icon: Satellite },
  { id: "terrain", label: "Terreno", icon: Mountain },
  { id: "hybrid", label: "Híbrido", icon: Layers },
] as const;

type MapTypeId = typeof mapTypeOptions[number]["id"];

const desertColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#eab308",
};

const GoogleMapView = ({
  markers,
  selectedMarkerName,
  onMarkerClick,
  patientLocation,
  mapClickMode = false,
  onMapClickLocation,
  rankMap,
  desertZones,
}: GoogleMapViewProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>("roadmap");
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [showPatientInfo, setShowPatientInfo] = useState(true);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation || !map) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        setUserLocation(loc);
        map.panTo(loc);
        map.setZoom(12);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map]);

  // Handle clicking on the map (for patient location)
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!mapClickMode || !onMapClickLocation) return;
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat != null && lng != null) {
        onMapClickLocation({ lat, lng });
      }
    },
    [mapClickMode, onMapClickLocation]
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      styles: mapStyles,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: isLoaded ? google.maps.ControlPosition.RIGHT_TOP : undefined,
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      minZoom: 2,
      maxZoom: 18,
      draggableCursor: mapClickMode ? "crosshair" : undefined,
    }),
    [isLoaded, mapClickMode]
  );

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Auto-fit bounds when markers change
  useEffect(() => {
    if (!map || markers.length === 0) return;
    if (selectedMarkerName) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    // Include patient location in bounds
    if (patientLocation) {
      bounds.extend({ lat: patientLocation.lat, lng: patientLocation.lng });
    }
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [map, markers, selectedMarkerName, patientLocation]);

  // Pan to selected marker
  useEffect(() => {
    if (!map || !selectedMarkerName) return;
    const target = markers.find((m) => m.name === selectedMarkerName);
    if (target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(Math.max(map.getZoom() || 8, 10));
    }
  }, [map, selectedMarkerName, markers]);

  // Pan to patient location when it first appears
  useEffect(() => {
    if (!map || !patientLocation) return;
    map.panTo({ lat: patientLocation.lat, lng: patientLocation.lng });
    if ((map.getZoom() || 7) < 10) {
      map.setZoom(10);
    }
    setShowPatientInfo(true);
  }, [map, patientLocation]);

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-secondary flex items-center justify-center">
        <p className="text-sm text-destructive">
          {GOOGLE_MAPS_API_KEY ? "Error loading Google Maps" : "Missing Google Maps API key"}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-secondary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[4/3] sm:aspect-[16/10] relative">
      {/* Map click mode banner */}
      {mapClickMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-purple-600 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-full shadow-lg animate-pulse flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 bg-white rounded-full" />
          Click anywhere to set patient location
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={DEFAULT_CENTER}
        zoom={7}
        options={mapOptions}
        mapTypeId={mapTypeId}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
      >
        {/* Facility markers */}
        {markers.map((marker, idx) => {
          const isSelected = selectedMarkerName === marker.name;
          const isHovered = hoveredMarker === marker.name;
          const rank = rankMap?.get(marker.name);
          const isRanked = rank != null;

          // Use numbered pin for ranked facilities, circle for others
          const icon = isRanked
            ? {
                url: createRankedMarkerUrl(rank),
                scaledSize: new google.maps.Size(36, 46),
                anchor: new google.maps.Point(18, 46),
              }
            : createMarkerIcon(marker.status, isSelected);

          return (
            <MarkerF
              key={`${marker.name}-${idx}`}
              position={{ lat: marker.lat, lng: marker.lng }}
              icon={icon}
              onClick={() => handleMarkerClick(marker)}
              onMouseOver={() => setHoveredMarker(marker.name)}
              onMouseOut={() => setHoveredMarker(null)}
              zIndex={isRanked ? 150 + (10 - rank) : isSelected ? 100 : isHovered ? 50 : 1}
              animation={isSelected && !isRanked ? google.maps.Animation.BOUNCE : undefined}
            >
              {(isHovered) && (
                <InfoWindowF
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onCloseClick={() => setHoveredMarker(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div className="p-1 min-w-[140px]">
                    {isRanked && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#0ea5e9",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}>
                          {rank}
                        </span>
                        <span style={{ fontSize: "10px", color: "#0ea5e9", fontWeight: "600" }}>
                          RECOMMENDED
                        </span>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground">{marker.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={cn("w-2 h-2 rounded-full", statusDotClasses[marker.status])} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {marker.status} · {marker.region}
                      </span>
                    </div>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}

        {/* Medical desert overlays */}
        {desertZones?.map((zone, i) => (
          <CircleF
            key={`desert-${zone.region}-${i}`}
            center={{ lat: zone.lat, lng: zone.lng }}
            radius={zone.radius}
            options={{
              fillColor: desertColors[zone.severity] || "#eab308",
              fillOpacity: 0.12,
              strokeColor: desertColors[zone.severity] || "#eab308",
              strokeOpacity: 0.4,
              strokeWeight: 2,
              clickable: false,
              zIndex: 0,
            }}
          />
        ))}

        {/* Patient location marker — prominent purple pin, draggable */}
        {patientLocation && (
          <MarkerF
            position={{ lat: patientLocation.lat, lng: patientLocation.lng }}
            draggable
            onDragEnd={(e) => {
              const lat = e.latLng?.lat();
              const lng = e.latLng?.lng();
              if (lat != null && lng != null && onMapClickLocation) {
                onMapClickLocation({ lat, lng });
              }
            }}
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
              fillColor: "#8b5cf6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 2,
              anchor: new google.maps.Point(12, 24),
            }}
            zIndex={300}
            animation={google.maps.Animation.DROP}
            onClick={() => setShowPatientInfo(!showPatientInfo)}
            title="Drag to reposition patient"
          >
            {showPatientInfo && (
              <InfoWindowF
                position={{ lat: patientLocation.lat, lng: patientLocation.lng }}
                onCloseClick={() => setShowPatientInfo(false)}
                options={{ disableAutoPan: true }}
              >
                <div className="p-1.5 min-w-[160px]">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#6d28d9", margin: 0 }}>
                      {patientLocation.label ?? "Patient"}
                    </p>
                  </div>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                    {patientLocation.lat.toFixed(4)}, {patientLocation.lng.toFixed(4)}
                  </p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                    Drag pin to reposition
                  </p>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>
        )}

        {/* User location marker */}
        {userLocation && (
          <MarkerF
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
              scale: 10,
            }}
            zIndex={200}
            title="Tu ubicación"
          />
        )}
      </GoogleMap>

      {/* Map Type Selector */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-card/95 border border-border rounded-lg p-1 backdrop-blur-md shadow-lg z-10">
        {mapTypeOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMapTypeId(id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
              mapTypeId === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Geolocate Button */}
      <button
        onClick={handleGeolocate}
        disabled={locating}
        className="absolute top-3 right-3 bg-card/95 border border-border rounded-lg p-2 backdrop-blur-md shadow-lg z-10 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-60"
        title="Mi ubicación"
      >
        {locating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LocateFixed className={cn("w-4 h-4", userLocation && "text-primary")} />
        )}
      </button>
    </div>
  );
};

export default GoogleMapView;
