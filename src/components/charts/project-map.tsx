"use client";

import { MapPin } from "lucide-react";
import { SULSEL_RINGS } from "./sulsel-geo";

export type RegencyPoint = {
  name: string;
  lat: number;
  lng: number;
  count: number;
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

export function ProjectMap({ data }: { data: RegencyPoint[] }) {
  const points = data.filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  const total = points.reduce((s, d) => s + d.count, 0);
  const maxC = Math.max(...points.map((d) => d.count), 1);
  const radius = (c: number) => 6 + Math.sqrt(c / maxC) * 12;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto,1fr]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mx-auto h-[320px] w-auto overflow-hidden"
        role="img"
        aria-label="Peta sebaran proyek di Sulawesi Selatan"
      >
        <path
          d={MAP_PATH}
          fill="hsl(var(--primary) / 0.12)"
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth={1}
          strokeLinejoin="round"
          fillRule="evenodd"
        />
        {points.map((p) => {
          const [x, y] = project(p.lng, p.lat);
          const r = radius(p.count);
          return (
            <g key={p.name}>
              <circle cx={x} cy={y} r={r + 3} fill="hsl(var(--primary) / 0.18)" />
              <circle
                cx={x}
                cy={y}
                r={r}
                fill="hsl(var(--primary))"
                fillOpacity={0.9}
                stroke="white"
                strokeWidth={1.25}
              >
                <title>
                  {p.name}: {p.count} proyek
                </title>
              </circle>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={r > 9 ? 11 : 9}
                fontWeight={700}
              >
                {p.count}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="min-w-0">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada proyek dengan lokasi yang terdeteksi di Sulawesi Selatan.
            Isi kolom Lokasi proyek dengan nama kabupaten/kota (mis. &quot;Luwu
            Timur&quot;, &quot;Makassar&quot;).
          </p>
        ) : (
          <>
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {points.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{p.count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              {total} proyek terpetakan di {points.length} kabupaten/kota
            </p>
          </>
        )}
      </div>
    </div>
  );
}
