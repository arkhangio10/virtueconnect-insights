export type Evidence = {
  row_id?: string;
  source_column?: string;
  snippet?: string;
  evidence_type?: string;
};

export type Capability = {
  value: boolean | null;
  state: string;
  confidence?: number;
  evidence?: Evidence[];
};

export type Anomaly = {
  facility_id?: string;
  bundle_name?: string;
  anomaly_type?: string;
  severity?: string;
  reason?: string;
  required_missing?: string[];
  evidence_rows?: Evidence[];
};

export type Facility = {
  facility_id: string;
  name: string;
  region?: string | null;
  district?: string | null;
  lat?: number | null;
  lon?: number | null;
  facility_type?: string | null;
  maternity?: Record<string, Capability>;
  trauma?: Record<string, Capability>;
  infrastructure?: Record<string, Capability>;
  anomalies?: Anomaly[];
  raw_specialties?: string[];
  raw_procedures?: string[];
};

export type FacilityMarker = {
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
};

export type Metrics = {
  totalFacilities: number;
  safeCSection: number;
  highRiskAnomalies: number;
  medicalDesertRegions: number;
  cSectionCoverage: number;
};

export type ActionPlan = {
  region: string;
  gap: string;
  impact: string;
  candidate: string;
  intervention: string;
  severityLabel: "High" | "Medium" | "Low";
};

export type FacilityRecommendation = {
  name: string;
  distance: string;
  capabilities: { name: string; available: boolean }[];
  evidence: string;
  triageLevel: "critical" | "stable" | "monitor";
};

const POSITIVE_STATES = new Set(["ASSERTED", "EXTRACTED"]);

const SAFE_OB_CAPS = ["c_section", "blood_bank", "anesthesia", "operating_room", "incubator"];

// ── Clinical context profiles ──────────────────────────────────────────────
export type ClinicalContext =
  | "general"
  | "obstetric"
  | "cardiac"
  | "blood"
  | "vitals"
  | "trauma"
  | "pediatric"
  | "surgical";

type ContextProfile = {
  /** capability keys to score (across maternity / trauma / infrastructure) */
  relevantCaps: string[];
  /** human-readable label shown in results */
  label: string;
};

const CONTEXT_PROFILES: Record<ClinicalContext, ContextProfile> = {
  general: {
    relevantCaps: ["emergency_24_7", "lab_basic", "pharmacy", "ambulance"],
    label: "General",
  },
  obstetric: {
    relevantCaps: ["c_section", "delivery_natural", "blood_bank", "anesthesia", "operating_room", "incubator", "ultrasound_ob", "anesthetist"],
    label: "OB/GYN",
  },
  cardiac: {
    relevantCaps: ["emergency_24_7", "general_surgery", "operating_room", "anesthesia", "xray", "lab_basic", "ambulance"],
    label: "Cardiac",
  },
  blood: {
    relevantCaps: ["blood_bank", "lab_basic", "emergency_24_7", "pharmacy"],
    label: "Blood / Transfusion",
  },
  vitals: {
    relevantCaps: ["emergency_24_7", "ambulance", "lab_basic", "pharmacy", "xray"],
    label: "Emergency Vitals",
  },
  trauma: {
    relevantCaps: ["trauma_surgery", "general_surgery", "emergency_24_7", "ambulance", "xray", "operating_room", "blood_bank", "anesthesia"],
    label: "Trauma",
  },
  pediatric: {
    relevantCaps: ["incubator", "lab_basic", "pharmacy", "emergency_24_7", "ultrasound_ob"],
    label: "Pediatric",
  },
  surgical: {
    relevantCaps: ["general_surgery", "operating_room", "anesthesia", "anesthetist", "blood_bank", "xray", "lab_basic"],
    label: "Surgical",
  },
};

/** Map of text keywords to actual capability keys */
const KEYWORD_TO_CAP: [RegExp, string][] = [
  [/\boperating\s*room\b/, "operating_room"],
  [/\bc[- ]?section\b/, "c_section"],
  [/\bcesarean\b/, "c_section"],
  [/\bblood\s*(bank|type|transfus|cross[- ]?match|loss|supply)\b/, "blood_bank"],
  [/\btransfusion\b/, "blood_bank"],
  [/\bcross[- ]?match\b/, "blood_bank"],
  [/\bhemorrhag\b/, "blood_bank"],
  [/\bhaemorrhag\b/, "blood_bank"],
  [/\bincubator\b/, "incubator"],
  [/\bnicu\b/, "incubator"],
  [/\bneonatal\b/, "incubator"],
  [/\banesthesi(a|st)\b/, "anesthesia"],
  [/\banesthetist\b/, "anesthetist"],
  [/\bultrasound\b/, "ultrasound_ob"],
  [/\bx[- ]?ray\b/, "xray"],
  [/\bradiolog\b/, "xray"],
  [/\bambulance\b/, "ambulance"],
  [/\bemergency\b/, "emergency_24_7"],
  [/\b24\/?7\b/, "emergency_24_7"],
  [/\blab(oratory)?\b/, "lab_basic"],
  [/\bpharmacy\b/, "pharmacy"],
  [/\bgeneral\s*surg(ery)?\b/, "general_surgery"],
  [/\btrauma\s*surg(ery)?\b/, "trauma_surgery"],
  [/\bdeliver(y|ies)?\b/, "delivery_natural"],
  [/\bmaternal\b/, "delivery_natural"],
];

/** Extract specific capability keys mentioned in text */
export function detectRequiredCaps(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [regex, cap] of KEYWORD_TO_CAP) {
    if (regex.test(lower)) found.add(cap);
  }
  return Array.from(found);
}

export type DetectedIntent = {
  context: ClinicalContext;
  requiredCaps: string[];
};

/** Detect clinical context + specific required capabilities from free-text */
export function detectClinicalIntent(text: string): DetectedIntent {
  const lower = text.toLowerCase();
  const requiredCaps = detectRequiredCaps(text);

  const patterns: [RegExp, ClinicalContext][] = [
    [/\b(c[- ]?section|obstetric|preeclampsia|eclampsia|ob\/gyn|obgyn|maternal|delivery|labor|gestation|nicu|prenatal|postnatal|pregnancy|pregnant)\b/, "obstetric"],
    [/\b(cardiac|heart|cardio|chest pain|myocard|arrhythmia|coronary|aortic)\b/, "cardiac"],
    [/\b(blood\s?(type|bank|transfus|cross[- ]?match|loss)|hemorrhag|bleeding|anemia|haemorrhag)\b/, "blood"],
    [/\b(vital\s?signs?|unstable|bp|blood pressure|hypotens|hypertens|tachycard|bradycard|fever|temperature|spo2|oxygen)\b/, "vitals"],
    [/\b(trauma|accident|fracture|broken|injury|wound|burn|crash|fall|assault)\b/, "trauma"],
    [/\b(pediatric|child|infant|neonate|newborn|baby|toddler)\b/, "pediatric"],
    [/\b(surg(ery|ical)|operat(ion|ing)|appendect|cholecyst|hernia|laparoscop|amputation)\b/, "surgical"],
  ];

  for (const [regex, context] of patterns) {
    if (regex.test(lower)) return { context, requiredCaps };
  }

  return { context: "general", requiredCaps };
}

/** backwards compat wrapper */
export function detectClinicalContext(text: string): ClinicalContext {
  return detectClinicalIntent(text).context;
}

/** Score + rank facilities for a specific clinical context, requiring specific caps */
export function deriveContextualRecommendations(
  facilities: Facility[],
  context: ClinicalContext,
  limit = 3,
  requiredCaps: string[] = []
): FacilityRecommendation[] {
  const profile = CONTEXT_PROFILES[context];
  const caps = profile.relevantCaps;

  const scored = facilities.map((facility) => {
    const allCaps: Record<string, Capability> = {
      ...(facility.maternity ?? {}),
      ...(facility.trauma ?? {}),
      ...(facility.infrastructure ?? {}),
    };

    const score = caps.reduce((acc, cap) => acc + (allCaps[cap]?.value === true ? 1 : 0), 0);

    // Check if all required caps are present
    const hasAllRequired = requiredCaps.every((cap) => allCaps[cap]?.value === true);

    return { facility, score, allCaps, hasAllRequired };
  });

  const ranked = scored
    .filter((item) => {
      // If there are required caps, facility MUST have them
      if (requiredCaps.length > 0) return item.hasAllRequired;
      // Otherwise just need at least 1 relevant cap
      return item.score > 0;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ facility, score, allCaps }, index) => {
    // Show the required caps first, then the rest of the profile caps
    const displayCaps = requiredCaps.length > 0
      ? [...new Set([...requiredCaps, ...caps])]
      : caps;

    const capabilities = displayCaps.map((cap) => ({
      name: cap.replace(/_/g, " ").toUpperCase(),
      available: allCaps[cap]?.value === true,
    }));

    const evidenceSource = displayCaps.find((cap) => allCaps[cap]?.evidence?.[0]?.snippet);
    const evidence = evidenceSource ? allCaps[evidenceSource]?.evidence?.[0]?.snippet : null;

    const anomalySeverity = (facility.anomalies ?? []).some((a) => {
      const sev = a.severity?.toUpperCase();
      const typ = a.anomaly_type?.toUpperCase() ?? "";
      return sev === "HIGH" || typ.includes("HIGH");
    });

    const triageLevel: FacilityRecommendation["triageLevel"] = anomalySeverity
      ? "monitor"
      : score >= Math.ceil(caps.length * 0.6)
        ? "stable"
        : "critical";

    return {
      name: facility.name,
      distance: `Region: ${facility.region ?? "Unknown"} · ${profile.label} Score ${score}/${caps.length}`,
      capabilities,
      evidence: evidence ?? `Scored on ${profile.label} capability profile`,
      triageLevel: index === 0 && !anomalySeverity ? "stable" : triageLevel,
    };
  });
}

/** Filter facility markers to only those matching specific required capabilities */
export function filterMarkersByCaps(
  facilities: Facility[],
  requiredCaps: string[]
): Set<string> {
  if (requiredCaps.length === 0) return new Set();

  const matchingIds = new Set<string>();
  facilities.forEach((facility) => {
    const allCaps: Record<string, Capability> = {
      ...(facility.maternity ?? {}),
      ...(facility.trauma ?? {}),
      ...(facility.infrastructure ?? {}),
    };
    const hasAll = requiredCaps.every((cap) => allCaps[cap]?.value === true);
    if (hasAll) matchingIds.add(facility.name);
  });
  return matchingIds;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function parseFacilities(raw: unknown): Facility[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : Object.values(raw as Record<string, Facility>);
  return list
    .filter((item): item is Facility => Boolean(item && typeof item === "object"))
    .map((item) => ({
      facility_id: String(item.facility_id ?? ""),
      name: String(item.name ?? "Unknown facility"),
      region: item.region ?? null,
      district: item.district ?? null,
      lat: toNumber(item.lat),
      lon: toNumber(item.lon),
      facility_type: item.facility_type ?? null,
      maternity: item.maternity ?? {},
      trauma: item.trauma ?? {},
      infrastructure: item.infrastructure ?? {},
      anomalies: item.anomalies ?? [],
      raw_specialties: item.raw_specialties ?? [],
      raw_procedures: item.raw_procedures ?? [],
    }));
}

export function deriveMetrics(facilities: Facility[]): Metrics {
  const totalFacilities = facilities.length;
  const safeCSection = facilities.filter((facility) => facility.maternity?.c_section?.value === true).length;
  const highRiskAnomalies = facilities.reduce((count, facility) => {
    const anomalies = facility.anomalies ?? [];
    return (
      count +
      anomalies.filter((anomaly) => {
        const severity = anomaly.severity?.toUpperCase();
        const type = anomaly.anomaly_type?.toUpperCase() ?? "";
        return severity === "HIGH" || type.includes("HIGH");
      }).length
    );
  }, 0);

  const regionTotals = new Map<string, number>();
  const regionSafe = new Map<string, number>();

  facilities.forEach((facility) => {
    const region = facility.region?.trim();
    if (!region) return;
    regionTotals.set(region, (regionTotals.get(region) ?? 0) + 1);
    if (facility.maternity?.c_section?.value === true) {
      regionSafe.set(region, (regionSafe.get(region) ?? 0) + 1);
    }
  });

  const medicalDesertRegions = Array.from(regionTotals.keys()).filter((region) => (regionSafe.get(region) ?? 0) === 0)
    .length;
  const cSectionCoverage = totalFacilities === 0 ? 0 : safeCSection / totalFacilities;

  return {
    totalFacilities,
    safeCSection,
    highRiskAnomalies,
    medicalDesertRegions,
    cSectionCoverage,
  };
}

export function buildMarkers(facilities: Facility[]): FacilityMarker[] {
  return facilities
    .filter((facility) => facility.lat != null && facility.lon != null)
    .map((facility) => {
      const anomalySeverity = (facility.anomalies ?? []).some((anomaly) => {
        const severity = anomaly.severity?.toUpperCase();
        const type = anomaly.anomaly_type?.toUpperCase() ?? "";
        return severity === "HIGH" || type.includes("HIGH");
      });
      const hasUncertain = Object.values({
        ...facility.maternity,
        ...facility.trauma,
        ...facility.infrastructure,
      }).some((capability) => capability?.state === "UNCERTAIN");

      const status: FacilityMarker["status"] = anomalySeverity ? "anomaly" : hasUncertain ? "uncertain" : "validated";

      const isMaternity = Boolean(
        facility.maternity?.delivery_natural?.value || facility.maternity?.c_section?.value
      );
      const isTrauma = Boolean(
        facility.trauma?.emergency_24_7?.value ||
          facility.trauma?.ambulance?.value ||
          facility.trauma?.xray?.value ||
          facility.trauma?.general_surgery?.value
      );
      const category: FacilityMarker["category"] = isMaternity
        ? "Maternity"
        : isTrauma
          ? "Trauma"
          : "Infrastructure";

      return {
        lat: facility.lat ?? 0,
        lng: facility.lon ?? 0,
        status,
        name: facility.name,
        category,
        region: facility.region ?? "Unknown",
        beds: null,
        lastAudit: null,
        specialties: facility.raw_specialties ?? [],
        facilityType: facility.facility_type ?? null,
      };
    });
}

export function deriveActionPlan(facilities: Facility[]): ActionPlan {
  const regionToAnomalies = new Map<string, Anomaly[]>();
  facilities.forEach((facility) => {
    const region = facility.region?.trim();
    if (!region) return;
    const anomalies = facility.anomalies ?? [];
    if (anomalies.length === 0) return;
    const existing = regionToAnomalies.get(region) ?? [];
    regionToAnomalies.set(region, existing.concat(anomalies));
  });

  if (regionToAnomalies.size === 0) {
    return {
      region: "No anomalies detected",
      gap: "All bundles satisfied",
      impact: "0 facilities affected",
      candidate: "N/A",
      intervention: "Maintain current standards",
      severityLabel: "Low",
    };
  }

  const [topRegion, topAnomalies] = Array.from(regionToAnomalies.entries()).sort(
    (a, b) => b[1].length - a[1].length
  )[0];

  const topAnomaly = topAnomalies[0];
  const gap = topAnomaly.reason ?? topAnomaly.required_missing?.[0] ?? "Capability gap detected";
  const severity = topAnomaly.severity?.toUpperCase();
  const severityLabel: ActionPlan["severityLabel"] =
    severity === "HIGH" ? "High" : severity === "LOW" ? "Low" : "Medium";

  const candidate = facilities.find((facility) => facility.region === topRegion)?.name ?? "Regional facility";

  const intervention = gap.toLowerCase().includes("ultrasound")
    ? "Deploy mobile ultrasound unit"
    : gap.toLowerCase().includes("blood")
      ? "Secure blood bank partnership"
      : gap.toLowerCase().includes("anesthesia")
        ? "Assign anesthesia coverage"
        : "Targeted capability upgrade";

  return {
    region: topRegion,
    gap,
    impact: `${topAnomalies.length} anomalies detected`,
    candidate,
    intervention,
    severityLabel,
  };
}

export function deriveRecommendations(facilities: Facility[], limit = 3): FacilityRecommendation[] {
  const scored = facilities.map((facility) => {
    const maternity = facility.maternity ?? {};
    const score = SAFE_OB_CAPS.reduce((acc, cap) => {
      const value = maternity?.[cap]?.value;
      return acc + (value === true ? 1 : 0);
    }, 0);

    return { facility, score };
  });

  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ facility, score }, index) => {
    const maternity = facility.maternity ?? {};
    const capabilities = SAFE_OB_CAPS.map((cap) => ({
      name: cap.replace(/_/g, " ").toUpperCase(),
      available: maternity?.[cap]?.value === true,
    }));
    const evidenceSource = SAFE_OB_CAPS.find((cap) => maternity?.[cap]?.evidence?.[0]?.snippet);
    const evidence = evidenceSource ? maternity?.[evidenceSource]?.evidence?.[0]?.snippet : null;

    const anomalySeverity = (facility.anomalies ?? []).some((anomaly) => {
      const severity = anomaly.severity?.toUpperCase();
      const type = anomaly.anomaly_type?.toUpperCase() ?? "";
      return severity === "HIGH" || type.includes("HIGH");
    });

    const triageLevel: FacilityRecommendation["triageLevel"] = anomalySeverity
      ? "monitor"
      : score >= 4
        ? "stable"
        : "critical";

    return {
      name: facility.name,
      distance: `Region: ${facility.region ?? "Unknown"} · Score ${score}/${SAFE_OB_CAPS.length}`,
      capabilities,
      evidence:
        evidence ??
        `Derived from ${POSITIVE_STATES.has(maternity?.delivery_natural?.state ?? "") ? "clinical" : "structured"} signals`,
      triageLevel: index === 0 ? "critical" : triageLevel,
    };
  });
}

export function buildSpecialtyOptions(facilities: Facility[], limit = 10): string[] {
  const counts = new Map<string, number>();
  facilities.forEach((facility) => {
    (facility.raw_specialties ?? []).forEach((specialty) => {
      const normalized = specialty.trim();
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([specialty]) => specialty);
}

// ── Medical Desert Zone detection ──────────────────────────────────────────
export type DesertZoneData = {
  lat: number;
  lng: number;
  radius: number;
  severity: "critical" | "high" | "moderate";
  region: string;
  gaps: string[];
};

export function deriveDesertZones(facilities: Facility[]): DesertZoneData[] {
  const regionMap = new Map<string, {
    lats: number[];
    lngs: number[];
    csection: number;
    blood: number;
    emergency: number;
    total: number;
  }>();

  facilities.forEach((f) => {
    const region = f.region?.trim();
    if (!region) return;
    const entry = regionMap.get(region) || { lats: [], lngs: [], csection: 0, blood: 0, emergency: 0, total: 0 };
    entry.total++;
    if (f.lat != null && f.lon != null) {
      entry.lats.push(f.lat);
      entry.lngs.push(f.lon);
    }
    if (f.maternity?.c_section?.value === true) entry.csection++;
    if (f.maternity?.blood_bank?.value === true) entry.blood++;
    if (f.trauma?.emergency_24_7?.value === true) entry.emergency++;
    regionMap.set(region, entry);
  });

  const zones: DesertZoneData[] = [];

  regionMap.forEach((stats, region) => {
    const gaps: string[] = [];
    if (stats.csection === 0) gaps.push("No C-Section");
    if (stats.blood === 0) gaps.push("No Blood Bank");
    if (stats.emergency === 0) gaps.push("No 24/7 Emergency");

    if (gaps.length === 0 || stats.lats.length === 0) return;

    // Compute centroid
    const lat = stats.lats.reduce((a, b) => a + b, 0) / stats.lats.length;
    const lng = stats.lngs.reduce((a, b) => a + b, 0) / stats.lngs.length;

    // Compute radius from spread (min 15km, max 80km)
    const latSpread = Math.max(...stats.lats) - Math.min(...stats.lats);
    const lngSpread = Math.max(...stats.lngs) - Math.min(...stats.lngs);
    const spread = Math.max(latSpread, lngSpread);
    const radius = Math.max(15000, Math.min(80000, spread * 111000 * 0.6));

    const severity = gaps.length >= 3 ? "critical" : gaps.length >= 2 ? "high" : "moderate";

    zones.push({ lat, lng, radius, severity, region, gaps });
  });

  return zones;
}
