import type { CrowdLevel } from "@/lib/metro-data";

const STYLES: Record<CrowdLevel, { bg: string; ring: string; text: string }> = {
  low: { bg: "bg-crowd-low", ring: "ring-crowd-low/30", text: "text-crowd-low" },
  mid: { bg: "bg-crowd-mid", ring: "ring-crowd-mid/30", text: "text-crowd-mid" },
  high: { bg: "bg-crowd-high", ring: "ring-crowd-high/30", text: "text-crowd-high" },
};

export function CrowdDot({
  level,
  size = "md",
  pulse = false,
}: {
  level: CrowdLevel;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}) {
  const s = STYLES[level];
  const dim = size === "sm" ? "h-2 w-2" : size === "lg" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  return (
    <span
      className={`inline-block rounded-full ring-4 ${s.bg} ${s.ring} ${dim} ${pulse ? "pulse-dot" : ""}`}
    />
  );
}

export function CrowdBadge({ level }: { level: CrowdLevel }) {
  const s = STYLES[level];
  const label = level === "low" ? "Comfortable" : level === "mid" ? "Moderate" : "Crowded";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium ${s.text}`}
      style={{ backgroundColor: `var(--color-crowd-${level}-soft)` }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.bg}`} />
      {label}
    </span>
  );
}
