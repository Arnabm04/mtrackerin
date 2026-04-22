// Mumbai Metro mock data for Lines 1, 2A, and 7.
// Replace getCrowdData() with your OpenCV inference output.

export type CrowdLevel = "low" | "mid" | "high";

// 0..1 density per coach for finer-grained visualization
export interface Coach {
  level: CrowdLevel;
  density: number; // 0..1
}

export interface MetroLine {
  id: string;
  name: string;
  shortName: string;
  color: string; // CSS var
  from: string;
  to: string;
  stations: string[];
}

export interface Train {
  id: string;
  lineId: string;
  departure: string; // HH:mm
  arrival: string;   // HH:mm at terminal
  direction: string; // "Towards X"
  destination: string; // exact terminal station name (matches a station in the line)
  currentStationIndex: number; // 0..stations.length-1, index along the train's travel direction
  platform: number;
  status: "On Time" | "Delayed" | "Boarding";
  overallCrowd: CrowdLevel;
  overallDensity: number;
  coaches: Coach[]; // length 12
}

export const LINES: MetroLine[] = [
  {
    id: "L1",
    name: "Line 1 — Blue Line",
    shortName: "L1",
    color: "var(--color-line-1)",
    from: "Versova",
    to: "Ghatkopar",
    stations: [
      "Versova", "D.N. Nagar", "Azad Nagar", "Andheri", "Western Express Hwy",
      "Chakala", "Airport Road", "Marol Naka", "Saki Naka", "Asalpha",
      "Jagruti Nagar", "Ghatkopar",
    ],
  },
  {
    id: "L2A",
    name: "Line 2A — Yellow Line",
    shortName: "L2A",
    color: "var(--color-line-2a)",
    from: "Dahisar East",
    to: "Andheri West",
    stations: [
      "Dahisar East", "Anand Nagar", "Kandarpada", "Mandapeshwar", "Eksar",
      "Borivali West", "Shimpoli", "Kandivali West", "Dahanukarwadi",
      "Valnai", "Malad West", "Lower Malad", "Bangur Nagar", "Goregaon West",
      "Oshiwara", "Lower Oshiwara", "Andheri West",
    ],
  },
  {
    id: "L7",
    name: "Line 7 — Red Line",
    shortName: "L7",
    color: "var(--color-line-7)",
    from: "Dahisar East",
    to: "Gundavali",
    stations: [
      "Dahisar East", "Ovaripada", "National Park", "Devipada", "Magathane",
      "Mahindra & Mahindra", "Bandongri", "Kurar", "Akurli", "Poisar",
      "Goregaon East", "Aarey", "Dindoshi", "JVLR Junction", "Mahanand",
      "Gundavali",
    ],
  },
];

// ---- Deterministic mock generation (so the UI is stable across renders) ----
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function densityToLevel(d: number): CrowdLevel {
  if (d < 0.4) return "low";
  if (d < 0.72) return "mid";
  return "high";
}

function aggregate(coaches: Coach[]): { level: CrowdLevel; density: number } {
  const avg = coaches.reduce((a, c) => a + c.density, 0) / coaches.length;
  return { level: densityToLevel(avg), density: avg };
}

// Each line gets a baseline density profile so trains feel different from each other
const LINE_PROFILE: Record<string, number[]> = {
  // 3-4 trains per line, varying base congestion
  L1: [0.28, 0.55, 0.82, 0.45],   // Blue: includes a packed peak train
  L2A: [0.35, 0.6, 0.78],         // Yellow: rising
  L7: [0.42, 0.7, 0.55, 0.3],     // Red: mixed
};

const TRAIN_TIMES: Record<string, string[]> = {
  L1: ["08:42", "09:06", "09:30", "09:54"],
  L2A: ["08:48", "09:12", "09:36"],
  L7: ["08:50", "09:14", "09:38", "10:02"],
};

export function generateTimetable(lineId: string): Train[] {
  const line = LINES.find((l) => l.id === lineId);
  if (!line) return [];
  const profile = LINE_PROFILE[lineId] ?? [0.4, 0.6];
  const times = TRAIN_TIMES[lineId] ?? ["09:00"];
  const trains: Train[] = [];
  const seedBase = lineId.charCodeAt(1) * 31 + (lineId.charCodeAt(2) ?? 0);

  profile.forEach((base, i) => {
    const rand = seeded(seedBase + i * 13 + 1);
    // Per-coach density varies around the train's base, with peak in middle coaches
    const coaches: Coach[] = Array.from({ length: 12 }, (_, idx) => {
      // Bell-curve weighting: middle coaches busier than ends
      const center = 5.5;
      const peak = 1 - Math.abs(idx - center) / 8; // ~0.31..1
      const noise = (rand() - 0.5) * 0.35;
      const d = Math.max(0.05, Math.min(0.98, base * (0.6 + 0.6 * peak) + noise));
      return { level: densityToLevel(d), density: d };
    });
    const agg = aggregate(coaches);
    const dirForward = i % 2 === 0;
    const travelMins = (line.stations.length - 1) * 2 + 4;
    const [hh, mm] = times[i].split(":").map(Number);
    const arrMins = hh * 60 + mm + travelMins;
    const arrival = `${String(Math.floor(arrMins / 60) % 24).padStart(2, "0")}:${String(arrMins % 60).padStart(2, "0")}`;
    const r = rand();
    const destination = dirForward ? line.to : line.from;
    // Pick a deterministic "current station" along the route (train mid-trip feel)
    const currentStationIndex = Math.floor(rand() * (line.stations.length - 2)) + 1;
    trains.push({
      id: `${lineId}-${String(i + 1).padStart(2, "0")}`,
      lineId,
      departure: times[i],
      arrival,
      direction: `Towards ${dirForward ? line.to : line.from}`,
      destination,
      currentStationIndex,
      platform: dirForward ? 1 : 2,
      status: r < 0.12 ? "Delayed" : r < 0.3 ? "Boarding" : "On Time",
      overallCrowd: agg.level,
      overallDensity: agg.density,
      coaches,
    });
  });

  return trains;
}

// ============================================================================
// CV INTEGRATION POINT
// ============================================================================
// TODO: Replace this stub with your OpenCV crowd-detection model output.
//
// Expected contract:
//   Input:  trainId (e.g. "L1-01")
//   Output: { coaches: Coach[] }   // length 12, density 0..1 per coach
//
// Suggested pipeline:
//   1. Camera feeds per coach -> frame grab (YOLO/MobileNet person detection)
//   2. Count people per coach, normalize by coach capacity -> density 0..1
//   3. Map density -> "low" | "mid" | "high" via densityToLevel()
//   4. Push results to a server endpoint or websocket; this function reads cache
//
// Example wiring:
//   const res = await fetch(`/api/crowd/${trainId}`);
//   const { coaches } = await res.json();
//   return { coaches };
// ============================================================================
export async function getCrowdData(
  trainId: string,
  fallback: Coach[],
): Promise<{ coaches: Coach[] }> {
  void trainId;
  return { coaches: fallback };
}

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  low: "Comfortable",
  mid: "Moderate",
  high: "Crowded",
};

export const CROWD_DESCRIPTION: Record<CrowdLevel, string> = {
  low: "Plenty of seats and standing space.",
  mid: "Most seats taken, comfortable standing room.",
  high: "Standing only, limited space near doors.",
};
