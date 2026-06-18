"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
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

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={filtered}
          margin={{ top: 28, right: 16, left: 16, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={48}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis hide domain={[0, max * 1.2]} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
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
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {filtered.map((d) => (
              <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#8b5cf6"} />
            ))}
          </Bar>
          {/* Line connecting the top of each bar */}
          <Line
            type="linear"
            dataKey="value"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            strokeOpacity={0.55}
            dot={{ r: 3, fill: "hsl(var(--foreground))", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          >
            <LabelList
              dataKey="value"
              position="top"
              offset={10}
              fill="hsl(var(--foreground))"
              fontSize={12}
              fontWeight={600}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-center text-xs text-muted-foreground">
        Total {total} proyek
      </p>
    </div>
  );
}
