import { useEffect, useMemo, useState } from "react";
import {
  Facility,
  Metrics,
  ActionPlan,
  FacilityMarker,
  FacilityRecommendation,
  DesertZoneData,
  buildMarkers,
  buildSpecialtyOptions,
  deriveActionPlan,
  deriveDesertZones,
  deriveMetrics,
  deriveRecommendations,
  parseFacilities,
} from "@/lib/facility-data";

// In production, use the API endpoint; in dev, use local file or env override
const SONIA_API_BASE =
  (import.meta.env.VITE_SONIA_API_URL as string | undefined) ?? "";
const DEFAULT_FACILITIES_URL = SONIA_API_BASE
  ? `${SONIA_API_BASE}/api/facilities`
  : "/api/facilities";

export type FacilitiesDataState = {
  facilities: Facility[];
  metrics: Metrics;
  actionPlan: ActionPlan;
  markers: FacilityMarker[];
  recommendations: FacilityRecommendation[];
  specialties: string[];
  desertZones: DesertZoneData[];
  loading: boolean;
  error: string | null;
};

function getFacilitiesUrl(): string {
  const envUrl = import.meta.env.VITE_FACILITIES_URL as string | undefined;
  return envUrl?.trim() ? envUrl : DEFAULT_FACILITIES_URL;
}

export function useFacilitiesData(): FacilitiesDataState {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const facilitiesUrl = getFacilitiesUrl();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(facilitiesUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load facilities (${response.status})`);
        }
        const raw = await response.json();
        const parsed = parseFacilities(raw);
        if (!cancelled) {
          setFacilities(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setFacilities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [facilitiesUrl]);

  const metrics = useMemo<Metrics>(() => deriveMetrics(facilities), [facilities]);
  const markers = useMemo<FacilityMarker[]>(() => buildMarkers(facilities), [facilities]);
  const actionPlan = useMemo<ActionPlan>(() => deriveActionPlan(facilities), [facilities]);
  const recommendations = useMemo<FacilityRecommendation[]>(
    () => deriveRecommendations(facilities),
    [facilities]
  );
  const specialties = useMemo(() => buildSpecialtyOptions(facilities), [facilities]);
  const desertZones = useMemo<DesertZoneData[]>(() => deriveDesertZones(facilities), [facilities]);

  return {
    facilities,
    metrics,
    actionPlan,
    markers,
    recommendations,
    specialties,
    desertZones,
    loading,
    error,
  };
}
