import { createFileRoute } from "@tanstack/react-router";
import { MetroDashboard } from "@/components/MetroDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mumbai Metro · Live Crowd Console" },
      {
        name: "description",
        content:
          "Real-time Mumbai Metro timetable with per-coach crowd intelligence powered by computer vision.",
      },
      { property: "og:title", content: "Mumbai Metro · Live Crowd Console" },
      {
        property: "og:description",
        content:
          "Per-coach occupancy heatmaps and live timetable for Mumbai Metro Lines 1, 2A and 7.",
      },
    ],
  }),
  component: MetroDashboard,
});
