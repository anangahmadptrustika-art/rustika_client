"use client";

import { MapPin } from "lucide-react";
import { SULSEL_RINGS } from "./sulsel-geo";

export type ProjectPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  location?: string | null;
};

// View focused on the South Sulawesi peninsula + the Luwu arm where projects
// sit (the old West-Sulawesi extension up north is cropped by the viewBox).
const BOX = { lngMin: 118.6, lngMax: 121.9, latMin: -7.6, latMax: -2.0 };
const W = 200;
const H = 340;

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - BOX.lngMin) / (BOX.lngMax - BOX.lngMin)) * W;
  const y = (1 - (lat - BOX.latMin) / (BOX.latMax - BOX.latMin)) * H;
  return [x, y];
}

const MAP_PATH = SULSEL_RINGS.map(
  (ring) =>
    "M" +
    ring
      .map(([lng, lat]) => project(lng, lat).map((n) => n.toFixed(1)).join(","))
      .join("L") +
    "Z"
).join(" ");

export function ProjectMap({ points }: { points: ProjectPoint[] }) {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  );

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto,1fr]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mx-auto h-[320px] w-auto overflow-hidden"
        role="img"
        aria-label="Peta titik koordinat proyek di Sulawesi Selatan"
      >
        <path
          d={MAP_PATH}
          fill="hsl(var(--primary) / 0.12)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth={1}
          strokeLinejoin="round"
          fillRule="evenodd"
        />
        {valid.map((p) => {
          const [x, y] = project(p.lng, p.lat);
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r={5.5} fill="hsl(var(--primary) / 0.18)" />
              <circle
                cx={x}
                cy={y}
                r={3}
                fill="hsl(var(--primary))"
                fillOpacity={0.9}
                stroke="white"
                strokeWidth={1}
              >
                <title>
                  {p.name}
                  {p.location ? ` — ${p.location}` : ""}
                </title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="min-w-0">
        {valid.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada proyek dengan titik koordinat. Isi kolom{" "}
            <b>Koordinat</b> di spreadsheet (mis.{" "}
            <code>2°31&apos;33&quot;S 121°21&apos;29&quot;E</code>) lalu jalankan
            sinkronisasi.
          </p>
        ) : (
          <>
            <ul className="grid max-h-[240px] gap-x-6 gap-y-1.5 overflow-auto pr-1 sm:grid-cols-2">
              {valid.map((p) => (
                <li
                  key={p.id}
                  className="flex min-w-0 items-center gap-2 text-sm"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span
                    className="truncate text-muted-foreground"
                    title={p.location ?? undefined}
                  >
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {valid.length} proyek terpetakan berdasarkan titik koordinat
            </p>
          </>
        )}
      </div>
    </div>
  );
}
