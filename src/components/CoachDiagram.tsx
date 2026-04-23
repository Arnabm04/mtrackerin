import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Sparkles } from "lucide-react";
import {
  type Train,
  type CrowdLevel,
  type Coach,
  type MetroLine,
  CROWD_LABEL,
  CROWD_DESCRIPTION,
  getCrowdData,
  formatDensity,
} from "@/lib/metro-data";
import { CrowdBadge } from "./CrowdDot";

const COACH_FILL: Record<CrowdLevel, string> = {
  low: "var(--color-crowd-low)",
  mid: "var(--color-crowd-mid)",
  high: "var(--color-crowd-high)",
};
const COACH_SOFT: Record<CrowdLevel, string> = {
  low: "var(--color-crowd-low-soft)",
  mid: "var(--color-crowd-mid-soft)",
  high: "var(--color-crowd-high-soft)",
};

export function CoachDiagram({
  train,
  line,
  onClose,
}: {
  train: Train;
  line: MetroLine;
  onClose: () => void;
}) {
  const [coaches, setCoaches] = useState<Coach[]>(train.coaches);
  const [selected, setSelected] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getCrowdData(train.id, train.coaches);
      if (!cancelled) setCoaches(data.coaches);
    })();
    return () => {
      cancelled = true;
    };
  }, [train.id, train.coaches]);

  const counts = coaches.reduce(
    (acc, c) => ({ ...acc, [c.level]: acc[c.level] + 1 }),
    { low: 0, mid: 0, high: 0 } as Record<CrowdLevel, number>,
  );

  const sel = coaches[selected];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface"
        style={{ boxShadow: "var(--shadow-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — line color stripe */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: line.color }}
        />
        <div className="flex items-start justify-between border-b border-border bg-surface-elevated p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span
                className="inline-flex h-5 items-center rounded-sm px-2 font-bold text-white"
                style={{ backgroundColor: line.color }}
              >
                {line.shortName}
              </span>
              Train {train.id}
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {train.direction}
            </h2>
            <p className="text-sm text-muted-foreground">
              Departs {train.departure} · Platform {train.platform} · {train.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-surface p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
          {/* Train diagram */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                12-Coach Layout
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Train density {formatDensity(train.overallDensity)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-5">
              <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Front · {train.direction.replace("Towards ", "")} →</span>
                <span>Rear</span>
              </div>

              {/* Metro train shape */}
              <div className="relative">
                <div className="flex items-stretch overflow-x-auto pb-1">
                  {/* Locomotive nose (front) */}
                  <Locomotive lineColor={line.color} side="front" />

                  {coaches.map((c, idx) => (
                    <CoachCar
                      key={idx}
                      idx={idx}
                      coach={c}
                      lineColor={line.color}
                      selected={selected === idx}
                      onSelect={() => setSelected(idx)}
                    />
                  ))}

                  {/* Locomotive tail */}
                  <Locomotive lineColor={line.color} side="rear" />
                </div>

                {/* Track + sleepers */}
                <div className="mt-1 flex items-center gap-[3px] overflow-hidden">
                  {Array.from({ length: 80 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-2 flex-shrink-0 rounded-sm bg-border-strong"
                    />
                  ))}
                </div>
                <div className="mt-0.5 h-px w-full bg-border-strong" />
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider">Legend:</span>
              <Legend level="low" count={counts.low} />
              <Legend level="mid" count={counts.mid} />
              <Legend level="high" count={counts.high} />
              <span className="ml-auto font-mono text-[10px]">
                LDS = Ladies · GEN = General
              </span>
            </div>
          </div>

          {/* Coach detail panel */}
          <div className="rounded-xl border border-border bg-surface-elevated p-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Coach {selected + 1} of 12
            </div>
            <div className="mt-2 mb-4">
              <CrowdBadge level={sel.level} />
            </div>
            <h4 className="font-display text-lg font-semibold">
              {CROWD_LABEL[sel.level]}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {CROWD_DESCRIPTION[sel.level]}
            </p>

            {/* Density bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Density</span>
                <span className="tabular-nums text-foreground">
                  {formatDensity(sel.density)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(sel.density * 100))}%`,
                    backgroundColor: COACH_FILL[sel.level],
                  }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <DetailRow label="Coach type">
                {selected === 0 || selected === 11
                  ? "Ladies (LDS)"
                  : "General"}
              </DetailRow>
              <DetailRow label="Capacity">~ 380 pax</DetailRow>
              <DetailRow label="Recommended">
                {sel.level === "low"
                  ? "Best choice"
                  : sel.level === "mid"
                    ? "Acceptable"
                    : "Try another coach"}
              </DetailRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachCar({
  idx,
  coach,
  lineColor,
  selected,
  onSelect,
}: {
  idx: number;
  coach: Coach;
  lineColor: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isLadies = idx === 0 || idx === 11;
  return (
    <button
      onClick={onSelect}
      className={`group relative mx-[2px] flex h-28 w-[64px] flex-shrink-0 flex-col justify-between border-y-2 p-1.5 transition-all ${
        selected ? "scale-[1.06] z-10" : "hover:scale-[1.02]"
      }`}
      style={{
        backgroundColor: COACH_SOFT[coach.level],
        borderColor: selected ? COACH_FILL[coach.level] : lineColor,
        boxShadow: selected ? `0 6px 16px -6px ${COACH_FILL[coach.level]}` : undefined,
      }}
    >
      {/* Roof line */}
      <div
        className="absolute inset-x-0 -top-[3px] h-[3px]"
        style={{ backgroundColor: lineColor }}
      />
      {/* Bottom skirt */}
      <div
        className="absolute inset-x-0 -bottom-[3px] h-[3px]"
        style={{ backgroundColor: lineColor, opacity: 0.6 }}
      />

      {/* Window strip */}
      <div className="flex h-3 items-center gap-[2px]">
        {Array.from({ length: 4 }).map((_, w) => (
          <span
            key={w}
            className="h-full flex-1 rounded-[2px] border"
            style={{
              backgroundColor: COACH_FILL[coach.level],
              borderColor: lineColor,
              opacity: 0.55 + 0.45 * coach.density,
            }}
          />
        ))}
      </div>

      {/* Door + number */}
      <div className="flex flex-col items-center justify-center">
        <span
          className="font-display text-base font-bold leading-none"
          style={{ color: COACH_FILL[coach.level] }}
        >
          {idx + 1}
        </span>
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          {isLadies ? "LDS" : "GEN"}
        </span>
        <span className="mt-0.5 font-mono text-[8px] tabular-nums text-foreground/70">
          {formatDensity(coach.density)}
        </span>
      </div>

      {/* Door slits */}
      <div className="flex justify-around">
        <span className="h-2 w-1.5 rounded-sm" style={{ backgroundColor: lineColor, opacity: 0.5 }} />
        <span className="h-2 w-1.5 rounded-sm" style={{ backgroundColor: lineColor, opacity: 0.5 }} />
      </div>

      {/* Wheels */}
      <div className="absolute -bottom-[7px] left-1.5 h-2 w-2 rounded-full bg-foreground/70" />
      <div className="absolute -bottom-[7px] right-1.5 h-2 w-2 rounded-full bg-foreground/70" />
    </button>
  );
}

function Locomotive({ lineColor, side }: { lineColor: string; side: "front" | "rear" }) {
  const radius = side === "front"
    ? "rounded-l-[28px] rounded-r-md"
    : "rounded-r-[28px] rounded-l-md";
  return (
    <div className="relative flex-shrink-0" style={{ width: 44 }}>
      <div
        className={`relative h-28 ${radius} border-y-2`}
        style={{
          backgroundColor: lineColor,
          borderColor: lineColor,
        }}
      >
        {/* Headlight / windshield */}
        <div
          className={`absolute top-3 ${
            side === "front" ? "left-2" : "right-2"
          } h-5 w-7 rounded-md bg-white/85`}
        />
        {/* Body stripe */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/40" />
        {/* Coupler */}
        <div
          className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-sm bg-foreground/60 ${
            side === "front" ? "right-[-4px]" : "left-[-4px]"
          }`}
        />
      </div>
      {/* Wheels */}
      <div className="absolute -bottom-[7px] left-2 h-2 w-2 rounded-full bg-foreground/70" />
      <div className="absolute -bottom-[7px] right-2 h-2 w-2 rounded-full bg-foreground/70" />
    </div>
  );
}

function Legend({ level, count }: { level: CrowdLevel; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: COACH_FILL[level] }}
      />
      <span>
        {CROWD_LABEL[level]} <span className="font-mono">({count})</span>
      </span>
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
