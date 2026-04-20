import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  type Train,
  type CrowdLevel,
  type MetroLine,
  CROWD_LABEL,
  CROWD_DESCRIPTION,
  getCrowdData,
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
  const [coaches, setCoaches] = useState<CrowdLevel[]>(train.coaches);
  const [source, setSource] = useState<"mock" | "cv-model">("mock");
  const [selected, setSelected] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getCrowdData(train.id, train.coaches);
      if (!cancelled) {
        setCoaches(data.coaches);
        setSource(data.source);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [train.id, train.coaches]);

  const counts = coaches.reduce(
    (acc, c) => ({ ...acc, [c]: acc[c] + 1 }),
    { low: 0, mid: 0, high: 0 } as Record<CrowdLevel, number>,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
        style={{ boxShadow: "var(--shadow-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border bg-surface-elevated p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span
                className="inline-block h-2 w-6 rounded-sm"
                style={{ backgroundColor: line.color }}
              />
              {line.shortName} · Train {train.id}
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
                {source === "cv-model" ? "● Live CV feed" : "○ Mock data"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-5">
              {/* Direction marker */}
              <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>← {train.direction.replace("Towards ", "")}</span>
                <span>Front of train</span>
              </div>

              {/* Coaches */}
              <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2">
                {/* Locomotive nose */}
                <div
                  className="flex-shrink-0 rounded-l-2xl border border-border bg-surface"
                  style={{ width: 18 }}
                />
                {coaches.map((level, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelected(idx)}
                    className={`group relative flex h-24 min-w-[58px] flex-1 flex-col items-center justify-between rounded-md border-2 p-2 transition-all ${
                      selected === idx
                        ? "scale-[1.04]"
                        : "hover:scale-[1.02]"
                    }`}
                    style={{
                      backgroundColor: COACH_SOFT[level],
                      borderColor:
                        selected === idx ? COACH_FILL[level] : "transparent",
                    }}
                  >
                    {/* Window strip */}
                    <div
                      className="h-1 w-full rounded-full opacity-70"
                      style={{ backgroundColor: COACH_FILL[level] }}
                    />
                    <div className="flex flex-col items-center">
                      <span
                        className="font-display text-lg font-bold leading-none"
                        style={{ color: COACH_FILL[level] }}
                      >
                        {idx + 1}
                      </span>
                      <span className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                        {idx === 0 || idx === 11 ? "LDS" : idx === 5 ? "♀" : "GEN"}
                      </span>
                    </div>
                    <div
                      className="h-1 w-full rounded-full opacity-70"
                      style={{ backgroundColor: COACH_FILL[level] }}
                    />
                  </button>
                ))}
                <div
                  className="flex-shrink-0 rounded-r-2xl border border-border bg-surface"
                  style={{ width: 18 }}
                />
              </div>

              {/* Track */}
              <div className="mt-2 flex items-center gap-1">
                <div className="h-px flex-1 bg-border-strong" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  ═══ TRACK ═══
                </span>
                <div className="h-px flex-1 bg-border-strong" />
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
              <CrowdBadge level={coaches[selected]} />
            </div>
            <h4 className="font-display text-lg font-semibold">
              {CROWD_LABEL[coaches[selected]]}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {CROWD_DESCRIPTION[coaches[selected]]}
            </p>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <DetailRow label="Coach type">
                {selected === 0 || selected === 11
                  ? "Ladies (LDS)"
                  : selected === 5
                    ? "Reserved"
                    : "General"}
              </DetailRow>
              <DetailRow label="Capacity">~ 380 pax</DetailRow>
              <DetailRow label="Recommended">
                {coaches[selected] === "low"
                  ? "Best choice"
                  : coaches[selected] === "mid"
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
