// Mumbai Metro mock data for Lines 1, 2A, and 7.
// Replace getCrowdData() with your OpenCV inference output.

export type CrowdLevel = "low" | "mid" | "high";

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
  platform: number;
  status: "On Time" | "Delayed" | "Boarding";
  overallCrowd: CrowdLevel;
  coaches: CrowdLevel[]; // length 12
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

function pickCrowd(r: number): CrowdLevel {
  if (r < 0.45) return "low";
  if (r < 0.8) return "mid";
  return "high";
}

function aggregate(coaches: CrowdLevel[]): CrowdLevel {
  const score = coaches.reduce(
    (a, c) => a + (c === "low" ? 0 : c === "mid" ? 1 : 2),
    0,
  );
  const avg = score / coaches.length;
  if (avg < 0.6) return "low";
  if (avg < 1.25) return "mid";
  return "high";
}

function fmt(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimetable(lineId: string): Train[] {
  const line = LINES.find((l) => l.id === lineId);
  if (!line) return [];
  const trains: Train[] = [];
  let seedBase = lineId.charCodeAt(1) * 31 + (lineId.charCodeAt(2) ?? 0);

  // Trains every 6 minutes from 06:00 to 23:00, alternating direction
  let t = 6 * 60;
  let i = 0;
  while (t <= 23 * 60) {
    const rand = seeded(seedBase + i * 7);
    const coaches = Array.from({ length: 12 }, () => pickCrowd(rand()));
    const overall = aggregate(coaches);
    const dirForward = i % 2 === 0;
    const travelMins = (line.stations.length - 1) * 2 + 4;
    trains.push({
      id: `${lineId}-${String(i).padStart(3, "0")}`,
      lineId,
      departure: fmt(t),
      arrival: fmt(t + travelMins),
      direction: `Towards ${dirForward ? line.to : line.from}`,
      platform: dirForward ? 1 : 2,
      status: rand() < 0.08 ? "Delayed" : rand() < 0.18 ? "Boarding" : "On Time",
      overallCrowd: overall,
      coaches,
    });
    t += 6;
    i += 1;
  }
  return trains;
}

// ============================================================================
// CV INTEGRATION POINT
// ============================================================================
// TODO: Replace this stub with your OpenCV crowd-detection model output.
//
// Expected contract:
//   Input:  trainId (e.g. "L1-042")
//   Output: { coaches: CrowdLevel[] }   // length 12, one entry per coach
//
// Suggested pipeline:
//   1. Camera feeds per coach -> frame grab (YOLO/MobileNet person detection)
//   2. Count people per coach, normalize by coach capacity
//   3. Map density -> "low" | "mid" | "high"
//   4. Push results to a server endpoint or websocket; this function reads cache
//
// Example wiring:
//   const res = await fetch(`/api/crowd/${trainId}`);
//   const { coaches } = await res.json();
//   return { coaches };
// ============================================================================
export async function getCrowdData(
  trainId: string,
  fallback: CrowdLevel[],
): Promise<{ coaches: CrowdLevel[]; source: "mock" | "cv-model" }> {
  // Returning mock for now. When your model is ready, swap this implementation.
  return { coaches: fallback, source: "mock" };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void trainId;
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
