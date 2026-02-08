import { useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { cn } from "@/lib/utils";
import { Map, Satellite, Mountain, Layers } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBjIIDtqZBwTXwYEI6o-OzDk6WshdnKT40";

// Ghana center coordinates
const GHANA_CENTER = { lat: 7.9465, lng: -1.0232 };

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
  beds: number;
  lastAudit: string;
}

interface GoogleMapViewProps {
  markers: MapMarker[];
  selectedMarkerName?: string | null;
  onMarkerClick?: (marker: MapMarker) => void;
}

const statusPinColors: Record<string, string> = {
  validated: "#22c55e",
  uncertain: "#eab308",
  anomaly: "#ef4444",
};

const statusTextClasses: Record<string, string> = {
  validated: "text-success",
  uncertain: "text-warning",
  anomaly: "text-danger",
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

const GoogleMapView = ({ markers, selectedMarkerName, onMarkerClick }: GoogleMapViewProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>("roadmap");

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
      minZoom: 6,
      maxZoom: 15,
      restriction: {
        latLngBounds: {
          north: 12.5,
          south: 3.5,
          west: -4.5,
          east: 2.5,
        },
        strictBounds: false,
      },
    }),
    [isLoaded]
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      onMarkerClick?.(marker);
      if (map) {
        map.panTo({ lat: marker.lat, lng: marker.lng });
        map.setZoom(Math.max(map.getZoom() || 8, 10));
      }
    },
    [onMarkerClick, map]
  );

  if (loadError) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-secondary flex items-center justify-center">
        <p className="text-sm text-destructive">Error loading Google Maps</p>
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
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={GHANA_CENTER}
        zoom={7}
        options={mapOptions}
        mapTypeId={mapTypeId}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {markers.map((marker) => {
          const isSelected = selectedMarkerName === marker.name;
          const isHovered = hoveredMarker === marker.name;

          return (
            <MarkerF
              key={marker.name}
              position={{ lat: marker.lat, lng: marker.lng }}
              icon={createMarkerIcon(marker.status, isSelected)}
              onClick={() => handleMarkerClick(marker)}
              onMouseOver={() => setHoveredMarker(marker.name)}
              onMouseOut={() => setHoveredMarker(null)}
              zIndex={isSelected ? 100 : isHovered ? 50 : 1}
              animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
            >
              {isHovered && !isSelected && (
                <InfoWindowF
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onCloseClick={() => setHoveredMarker(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div className="p-1 min-w-[140px]">
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
    </div>
  );
};

export default GoogleMapView;
