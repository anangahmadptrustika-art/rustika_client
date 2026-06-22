import { Progress } from "@/components/ui/progress";
import {
  REALISASI_TEMPLATE,
  itemContribution,
  projectRealisasiTotal,
  sanitizeRealisasiMap,
  stageBobot,
  stageProgress,
  subStageBobot,
  subStageProgress,
} from "@/lib/realisasi-template";

const fmt = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)}%`;

/** Read-only Laporan Realisasi breakdown (for the client portal). */
export function RealisasiReadonly({ realisasi }: { realisasi: unknown }) {
  const map = sanitizeRealisasiMap(realisasi);
  const total = projectRealisasiTotal(map);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Total Realisasi</span>
          <span className="text-lg font-bold text-primary">{fmt(total)}</span>
        </div>
        <Progress value={total} className="h-2.5" />
      </div>

      {REALISASI_TEMPLATE.map((stage) => (
        <div key={stage.key} className="overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-3 bg-primary/10 px-4 py-2.5">
            <h3 className="font-semibold">{stage.name}</h3>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {fmt(stageProgress(stage, map))}{" "}
              <span className="font-normal text-muted-foreground">
                / bobot {fmt(stageBobot(stage))}
              </span>
            </span>
          </div>

          {stage.items.map((sub) => (
            <div key={sub.key} className="border-t">
              <div className="flex items-center justify-between gap-3 bg-sky-500/10 px-4 py-2">
                <h4 className="text-sm font-medium">{sub.name}</h4>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {fmt(subStageProgress(sub, map))} / {fmt(subStageBobot(sub))}
                </span>
              </div>
              <ul className="divide-y">
                {sub.items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      bobot {fmt(item.bobot)}
                    </span>
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {map[item.key] ?? 0}%
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums">
                      {fmt(itemContribution(item, map))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
