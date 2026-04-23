import { createFileRoute } from "@tanstack/react-router";

// Proxies an image upload to the user's Python YOLO crowd-analysis backend.
// The backend (cv_server.py) must expose POST /analyze accepting multipart
// "file" and returning JSON: { count, occupancy, score, density }.
//
// We expose this under /api/public/* so the route bypasses auth on published
// sites. The CV_BACKEND_URL secret is read server-side only — never shipped
// to the browser.

export const Route = createFileRoute("/api/public/cv-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const backend = process.env.CV_BACKEND_URL;
        if (!backend) {
          return Response.json(
            { error: "CV_BACKEND_URL is not configured" },
            { status: 503 },
          );
        }

        const ct = request.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
          return Response.json(
            { error: "Expected multipart/form-data with a 'file' field" },
            { status: 400 },
          );
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing 'file' field" }, { status: 400 });
        }
        if (file.size > 8 * 1024 * 1024) {
          return Response.json({ error: "File too large (max 8MB)" }, { status: 413 });
        }
        if (!file.type.startsWith("image/")) {
          return Response.json({ error: "File must be an image" }, { status: 400 });
        }

        const upstream = new FormData();
        upstream.append("file", file, file.name || "coach.jpg");

        const url = backend.replace(/\/+$/, "") + "/analyze";
        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            body: upstream,
            // 30s soft timeout via AbortSignal
            signal: AbortSignal.timeout(30_000),
          });
        } catch (err) {
          return Response.json(
            {
              error: "Could not reach CV backend",
              detail: err instanceof Error ? err.message : String(err),
            },
            { status: 502 },
          );
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return Response.json(
            { error: `CV backend error (${res.status})`, detail: text.slice(0, 400) },
            { status: 502 },
          );
        }

        const data = (await res.json()) as {
          count?: number;
          occupancy?: number;
          score?: number;
          density?: string;
        };

        // Normalize density string -> 0..1 float used by the UI.
        const labelMap: Record<string, number> = { LOW: 0.3, MEDIUM: 0.6, HIGH: 0.9 };
        const normalized =
          typeof data.score === "number"
            ? data.score
            : (data.density && labelMap[data.density.toUpperCase()]) ?? 0.5;

        return Response.json({
          count: data.count ?? 0,
          occupancy: data.occupancy ?? 0,
          score: data.score ?? normalized,
          density: (data.density ?? "MEDIUM").toUpperCase(),
          normalized,
        });
      },
    },
  },
});