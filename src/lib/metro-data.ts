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
  // ETA per stop (HH:mm) in the train's travel direction; length === stations.length
  stationEtas: string[];
  // Minutes from "now" to each station; negative = passed; same length as stations
  minutesToStation: number[];
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
  const sum = coaches.reduce((a, c) => a + c.density, 0);
  const avg = coaches.length > 0 ? sum / coaches.length : 0;
  // For overall level, cap at 1 so an over-capacity train still maps cleanly to "high"
  return { level: densityToLevel(Math.min(1, avg)), density: avg };
}

// Per-train shape profile so each train looks meaningfully different
type Shape = "bell" | "front" | "rear" | "even" | "split";
interface TrainProfile {
  base: number;   // baseline density
  shape: Shape;
  amp: number;    // shape amplitude
  noise: number;  // jitter
  cap: number;    // upper clamp; >1 means coach can be over-capacity
}

const TRAIN_PROFILES: Record<string, TrainProfile[]> = {
  // Line 1 — Blue: 4 trains, very mixed
  L1: [
    { base: 0.28, shape: "even",  amp: 0.18, noise: 0.18, cap: 0.95 },
    { base: 0.55, shape: "front", amp: 0.40, noise: 0.20, cap: 1.05 },
    { base: 0.82, shape: "bell",  amp: 0.35, noise: 0.18, cap: 1.20 }, // packed peak
    { base: 0.45, shape: "rear",  amp: 0.35, noise: 0.22, cap: 1.00 },
  ],
  // Line 2A — Yellow: 3 trains, rising
  L2A: [
    { base: 0.32, shape: "bell",  amp: 0.30, noise: 0.20, cap: 0.95 },
    { base: 0.60, shape: "split", amp: 0.35, noise: 0.20, cap: 1.10 },
    { base: 0.80, shape: "front", amp: 0.32, noise: 0.18, cap: 1.18 },
  ],
  // Line 7 — Red: 4 trains, mixed
  L7: [
    { base: 0.40, shape: "rear",  amp: 0.32, noise: 0.22, cap: 1.00 },
    { base: 0.72, shape: "bell",  amp: 0.40, noise: 0.18, cap: 1.15 },
    { base: 0.55, shape: "split", amp: 0.30, noise: 0.22, cap: 1.05 },
    { base: 0.30, shape: "even",  amp: 0.18, noise: 0.20, cap: 0.92 },
  ],
};

function shapeWeight(shape: Shape, idx: number, n: number): number {
  const t = idx / (n - 1); // 0..1 along train
  switch (shape) {
    case "bell":  return 1 - Math.abs(t - 0.5) * 2;
    case "front": return 1 - t;
    case "rear":  return t;
    case "split": return Math.abs(t - 0.5) * 2;
    case "even":
    default:      return 0.5;
  }
}

const TRAIN_TIMES: Record<string, string[]> = {
  L1: ["08:42", "09:06", "09:30", "09:54"],
  L2A: ["08:48", "09:12", "09:36"],
  L7: ["08:50", "09:14", "09:38", "10:02"],
};

// Per-segment travel minutes between consecutive stations
function segmentMinutes(_lineId: string, segIdx: number): number {
  const base = 2;
  if (segIdx % 7 === 0) return base + 1;
  if (segIdx % 4 === 0) return base + 1;
  if (segIdx % 5 === 0) return Math.max(1, base - 1);
  return base;
}
const DWELL_MIN = 0.5;
function fmtClock(totalMins: number): string {
  const m = ((Math.round(totalMins) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function generateTimetable(lineId: string): Train[] {
  const line = LINES.find((l) => l.id === lineId);
  if (!line) return [];
  const profiles =
    TRAIN_PROFILES[lineId] ??
    ([{ base: 0.4, shape: "bell", amp: 0.3, noise: 0.2, cap: 1 }] as TrainProfile[]);
  const times = TRAIN_TIMES[lineId] ?? ["09:00"];
  const trains: Train[] = [];
  const seedBase = lineId.charCodeAt(1) * 31 + (lineId.charCodeAt(2) ?? 0);

  profiles.forEach((prof, i) => {
    const rand = seeded(seedBase + i * 13 + 1);
    // Per-coach density driven by the train's profile shape
    const coaches: Coach[] = Array.from({ length: 12 }, (_, idx) => {
      const w = shapeWeight(prof.shape, idx, 12);
      const noise = (rand() - 0.5) * prof.noise;
      const raw = prof.base + (w - 0.4) * prof.amp + noise;
      const d = Math.max(0.05, Math.min(prof.cap, raw));
      return { level: densityToLevel(Math.min(1, d)), density: d };
    });
    const agg = aggregate(coaches);
    const dirForward = i % 2 === 0;
    // Per-station ETAs along the train's natural (forward) direction
    const [hh, mm] = times[i].split(":").map(Number);
    const departMins = hh * 60 + mm;
    const fwdEtas: string[] = [];
    let acc = departMins;
    for (let s = 0; s < line.stations.length; s++) {
      fwdEtas.push(fmtClock(acc));
      if (s < line.stations.length - 1) {
        acc += segmentMinutes(lineId, s) + DWELL_MIN;
      }
    }
    const arrival = fwdEtas[fwdEtas.length - 1];
    // Simulate "now" so the train sits mid-route
    const nowOffset = Math.floor(rand() * 14) + 6;
    const nowMins = departMins + nowOffset;
    const fwdMinutesToStation = fwdEtas.map((eta) => {
      const [eh, em] = eta.split(":").map(Number);
      return eh * 60 + em - nowMins;
    });
    const r = rand();
    const destination = dirForward ? line.to : line.from;
    const stationEtas = dirForward ? fwdEtas : [...fwdEtas].reverse();
    const minutesToStation = dirForward
      ? fwdMinutesToStation
      : [...fwdMinutesToStation].reverse();
    // Current station = last index already reached (mins <= 0); clamp so a next stop exists
    let currentStationIndex = 0;
    for (let s = 0; s < minutesToStation.length; s++) {
      if (minutesToStation[s] <= 0) currentStationIndex = s;
      else break;
    }
    currentStationIndex = Math.min(currentStationIndex, line.stations.length - 2);
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
      stationEtas,
      minutesToStation,
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

// Format density (0..~1.25) as a percent string.
// Never returns NaN; values >100% are shown verbatim (e.g. "112%").
export function formatDensity(d: number | null | undefined): string {
  if (d === null || d === undefined || Number.isNaN(d)) return "0%";
  const pct = Math.max(0, Math.round(d * 100));
  return `${pct}%`;
}

// Format ETA distance: "Now" / "1 min" / "12 min" / "Departed"
export function formatEta(mins: number | null | undefined): string {
  if (mins === null || mins === undefined || Number.isNaN(mins)) return "—";
  const m = Math.round(mins);
  if (m <= -2) return "Departed";
  if (m <= 0) return "Now";
  if (m === 1) return "1 min";
  return `${m} min`;
}
