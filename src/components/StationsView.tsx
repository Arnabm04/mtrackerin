import { ArrowRight, Train as TrainIcon, X } from "lucide-react";
import { type Train, type MetroLine } from "@/lib/metro-data";
import { CrowdBadge, CrowdDot } from "./CrowdDot";

export function StationsView({
  train,
  line,
  onClose,
  onOpenCrowd,
}: {
  train: Train;
  line: MetroLine;
  onClose: () => void;
  onOpenCrowd: () => void;
}) {
  // Build the station list in the train's actual travel direction
  const forward = train.destination === line.to;
  const stations = forward ? line.stations : [...line.stations].reverse();
  const currentIdx = train.currentStationIndex;
  const nextIdx = Math.min(currentIdx + 1, stations.length - 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface"
        style={{ boxShadow: "var(--shadow-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color stripe */}
        <div className="h-1.5 w-full" style={{ backgroundColor: line.color }} />

        {/* Header */}
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
              {stations[0]} <ArrowRight className="inline h-5 w-5" /> {train.destination}
            </h2>
            <p className="text-sm text-muted-foreground">
              Departed {train.departure} · Now near{" "}
              <span className="font-medium text-foreground">{stations[currentIdx]}</span> · ETA{" "}
              {train.arrival}
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Live route position</h3>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Stop {currentIdx + 1} of {stations.length}
            </span>
          </div>

          {/* Vertical station rail */}
          <ol className="relative ml-1">
            {stations.map((s, idx) => {
              const passed = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isNext = idx === nextIdx && !isCurrent;
              return (
                <li key={s + idx} className="relative flex items-stretch gap-4">
                  {/* Rail + node column */}
                  <div className="relative flex w-8 flex-col items-center">
                    {/* Top half line */}
                    <span
                      className={`w-[3px] flex-1 ${idx === 0 ? "opacity-0" : ""}`}
                      style={{
                        backgroundColor: passed || isCurrent ? line.color : "var(--color-border-strong)",
                      }}
                    />
                    {/* Node */}
                    {isCurrent ? (
                      <span
                        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-surface shadow-md"
                        style={{ borderColor: line.color }}
                      >
                        <TrainIcon className="h-3.5 w-3.5" style={{ color: line.color }} />
                        <span
                          className="absolute -inset-1 -z-10 rounded-full opacity-30"
                          style={{ backgroundColor: line.color, animation: "pulse-soft 1.6s ease-in-out infinite" }}
                        />
                      </span>
                    ) : (
                      <span
                        className="relative z-10 h-3 w-3 rounded-full border-2"
                        style={{
                          borderColor: passed ? line.color : "var(--color-border-strong)",
                          backgroundColor: passed ? line.color : "var(--color-surface)",
                        }}
                      />
                    )}
                    {/* Bottom half line */}
                    <span
                      className={`w-[3px] flex-1 ${idx === stations.length - 1 ? "opacity-0" : ""}`}
                      style={{
                        backgroundColor: passed ? line.color : "var(--color-border-strong)",
                      }}
                    />
                  </div>

                  {/* Station row */}
                  <div
                    className={`flex flex-1 items-center justify-between border-b border-border py-3 ${
                      isCurrent ? "bg-accent/40 -mx-3 rounded-md px-3" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-display text-base ${
                            isCurrent
                              ? "font-semibold"
                              : passed
                                ? "text-muted-foreground line-through decoration-1"
                                : "font-medium"
                          }`}
                        >
                          {s}
                        </span>
                        {isCurrent && (
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white"
                            style={{ backgroundColor: line.color }}
                          >
                            Train Here
                          </span>
                        )}
                        {isNext && (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Next Stop
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {idx === 0 ? "Origin" : idx === stations.length - 1 ? "Terminal" : `Stop ${idx + 1}`}
                      </div>
                    </div>
                    {idx === stations.length - 1 && (
                      <span className="font-mono text-xs text-muted-foreground">{train.arrival}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Footer CTA → opens crowd density */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-3">
            <CrowdDot level={train.overallCrowd} size="lg" pulse />
            <div>
              <div className="font-display text-sm font-semibold">Train crowd index</div>
              <div className="text-xs text-muted-foreground">
                Inspect per-coach density across all 12 coaches
              </div>
            </div>
            <div className="ml-2">
              <CrowdBadge level={train.overallCrowd} />
            </div>
          </div>
          <button
            onClick={onOpenCrowd}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: line.color }}
          >
            View crowd density
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}