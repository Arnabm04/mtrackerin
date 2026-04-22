import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronRight, Clock, MapPin, Navigation, Search } from "lucide-react";
import {
  LINES,
  generateTimetable,
  type Train,
  type CrowdLevel,
  formatDensity,
} from "@/lib/metro-data";
import { CrowdDot, CrowdBadge } from "./CrowdDot";
import { CoachDiagram } from "./CoachDiagram";
import { StationsView } from "./StationsView";

export function MetroDashboard() {
  const [activeLineId, setActiveLineId] = useState(LINES[0].id);
  const [filter, setFilter] = useState<"all" | CrowdLevel>("all");
  const [query, setQuery] = useState("");
  const [stationsTrain, setStationsTrain] = useState<Train | null>(null);
  const [crowdTrain, setCrowdTrain] = useState<Train | null>(null);
  // Direction = terminal station the user wants to travel toward.
  // null means "Both directions".
  const [direction, setDirection] = useState<string | null>(null);

  const line = LINES.find((l) => l.id === activeLineId)!;
  const allTrains = useMemo(() => generateTimetable(activeLineId), [activeLineId]);

  // Reset direction when switching lines (terminals change)
  useEffect(() => {
    setDirection(null);
  }, [activeLineId]);

  const filtered = useMemo(() => {
    return allTrains.filter((t) => {
      if (filter !== "all" && t.overallCrowd !== filter) return false;
      if (direction && t.destination !== direction) return false;
      if (
        query &&
        !t.direction.toLowerCase().includes(query.toLowerCase()) &&
        !t.id.toLowerCase().includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allTrains, filter, query, direction]);

  const stats = useMemo(() => {
    return allTrains.reduce(
      (acc, t) => {
        acc[t.overallCrowd] += 1;
        return acc;
      },
      { low: 0, mid: 0, high: 0 } as Record<CrowdLevel, number>,
    );
  }, [allTrains]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
              style={{ backgroundColor: line.color }}
            >
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold leading-tight">
                Mumbai Metro · Live Operations
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Crowd Intelligence Console
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 grid-bg opacity-40" />

        {/* Title block */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Mumbai Metro · Lines 1 · 2A · 7
            </p>
            <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Timetable & Crowd Index
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Pick a line, scan today's departures, and tap a train to inspect
              per-coach crowd density across the 12 coaches.
            </p>
          </div>

          {/* Live stats */}
          <div className="flex gap-2">
            <StatCard label="Comfortable" value={stats.low} level="low" />
            <StatCard label="Moderate" value={stats.mid} level="mid" />
            <StatCard label="Crowded" value={stats.high} level="high" />
          </div>
        </div>

        {/* Line selector with flag colors */}
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {LINES.map((l) => {
            const active = l.id === activeLineId;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLineId(l.id)}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-foreground bg-surface shadow-[var(--shadow-elevated)]"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
                style={
                  active
                    ? { borderColor: l.color, boxShadow: `0 0 0 2px color-mix(in oklab, ${l.color} 25%, transparent)` }
                    : undefined
                }
              >
                {/* Flag color bar */}
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: l.color }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-md font-display text-xs font-bold text-white"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.shortName}
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {l.name.split("—")[1]?.trim()}
                      </div>
                      <div className="font-display text-base font-semibold">
                        {l.from} ↔ {l.to}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      active ? "translate-x-0 text-foreground" : "text-muted-foreground group-hover:translate-x-0.5"
                    }`}
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {l.stations.length} stations
                </div>
              </button>
            );
          })}
        </div>

        {/* Direction selector — pick destination terminal */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Navigation className="h-3 w-3" />
            Travelling toward
          </div>
          <div className="flex flex-wrap gap-2">
            <DirectionPill
              label="Both directions"
              active={direction === null}
              onClick={() => setDirection(null)}
              color={line.color}
            />
            <DirectionPill
              label={`Towards ${line.to}`}
              active={direction === line.to}
              onClick={() => setDirection(line.to)}
              color={line.color}
            />
            <DirectionPill
              label={`Towards ${line.from}`}
              active={direction === line.from}
              onClick={() => setDirection(line.from)}
              color={line.color}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
          <div className="flex flex-1 items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by station, direction or train ID…"
              className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["all", "low", "mid", "high"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  filter === f
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "low" ? "Comfortable" : f === "mid" ? "Moderate" : "Crowded"}
              </button>
            ))}
          </div>
        </div>

        {/* Timetable */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-[80px_1fr_120px_100px_160px_40px] items-center gap-4 border-b border-border bg-surface-elevated px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Depart</span>
            <span>Direction</span>
            <span>Train</span>
            <span>Platform</span>
            <span>Crowd</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No trains match these filters.
            </div>
          ) : (
            <ul>
              {filtered.map((t, idx) => {
                const isNext = idx === 0;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setStationsTrain(t)}
                      className="grid w-full grid-cols-[80px_1fr_120px_100px_160px_40px] items-center gap-4 border-b border-border px-5 py-4 text-left transition hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-8 w-1 rounded-full"
                          style={{ backgroundColor: line.color }}
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold tabular-nums">
                              {t.departure}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.direction}</span>
                          {isNext && (
                            <span
                              className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white"
                              style={{ backgroundColor: line.color }}
                            >
                              Next
                            </span>
                          )}
                          {t.status !== "On Time" && (
                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                                t.status === "Delayed"
                                  ? "bg-crowd-high-soft text-crowd-high"
                                  : "bg-crowd-mid-soft text-crowd-mid"
                              }`}
                            >
                              {t.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          arrives {t.arrival}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.id}
                      </span>
                      <span className="font-mono text-sm">PF {t.platform}</span>
                      <div className="flex items-center gap-2">
                        <CrowdDot level={t.overallCrowd} pulse={isNext} />
                        <CrowdBadge level={t.overallCrowd} />
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {formatDensity(t.overallDensity)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {stationsTrain && !crowdTrain && (
        <StationsView
          train={stationsTrain}
          line={line}
          onClose={() => setStationsTrain(null)}
          onOpenCrowd={() => setCrowdTrain(stationsTrain)}
        />
      )}

      {crowdTrain && (
        <CoachDiagram
          train={crowdTrain}
          line={line}
          onClose={() => {
            setCrowdTrain(null);
            // Returning from crowd view drops back to the stations view
          }}
        />
      )}
    </div>
  );
}

function DirectionPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "text-white"
          : "border-border bg-surface text-muted-foreground hover:text-foreground"
      }`}
      style={
        active
          ? { backgroundColor: color, borderColor: color }
          : undefined
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? "white" : color }}
      />
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  level,
}: {
  label: string;
  value: number;
  level: CrowdLevel;
}) {
  return (
    <div
      className="flex min-w-[110px] items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
      style={{ backgroundColor: `var(--color-crowd-${level}-soft)` }}
    >
      <CrowdDot level={level} size="lg" />
      <div>
        <div className="font-display text-xl font-bold leading-none tabular-nums">
          {value}
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
