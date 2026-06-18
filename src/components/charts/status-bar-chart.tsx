"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Distinct, modern color per project status (keyed by its label). */
const STATUS_COLORS: Record<string, string> = {
  PBG: "#f59e0b",
  SLF: "#10b981",
  "PBG Under Construction": "#3b82f6",
  "SLF Under Construction": "#06b6d4",
  Construction: "#6366f1",
  Design: "#8b5cf6",
  Supervisi: "#f97316",
};

export function StatusBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const filtered = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (filtered.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Belum ada data status.
      </p>
    );
  }

  const total = filtered.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...filtered.map((d) => d.value), 1);
  const height = Math.max(160, filtered.length * 48 + 24);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={filtered}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          barCategoryGap="28%"
        >
          <XAxis type="number" hide domain={[0, max * 1.15]} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={150}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: 12,
            }}
            formatter={(v: number) => [
              `${v} proyek (${Math.round((v / total) * 100)}%)`,
              "Jumlah",
            ]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {filtered.map((d) => (
              <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#8b5cf6"} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              fill="hsl(var(--foreground))"
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-center text-xs text-muted-foreground">
        Total {total} proyek
      </p>
    </div>
  );
}
