"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { saveRealisasi } from "@/app/(app)/realisasi/actions";
import {
  REALISASI_TEMPLATE,
  itemContribution,
  projectRealisasiTotal,
  stageBobot,
  stageProgress,
  subStageBobot,
  subStageProgress,
  type RealisasiMap,
} from "@/lib/realisasi-template";

const fmt = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)}%`;

export function RealisasiEditor({
  projectId,
  initial,
  canEdit,
}: {
  projectId: string;
  initial: RealisasiMap;
  canEdit: boolean;
}) {
  const [map, setMap] = useState<RealisasiMap>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const total = projectRealisasiTotal(map);

  function setItem(key: string, raw: string) {
    const n = Math.max(0, Math.min(100, Number(raw) || 0));
    setMap((m) => ({ ...m, [key]: n }));
  }

  function save() {
    startTransition(async () => {
      const res = await saveRealisasi(projectId, map);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Sticky total + save */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-xl border bg-card/95 p-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Total Realisasi</span>
            <span className="text-lg font-bold text-primary">{fmt(total)}</span>
          </div>
          <Progress value={total} className="h-2.5" />
        </div>
        {canEdit && (
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        )}
      </div>

      {REALISASI_TEMPLATE.map((stage) => (
        <div key={stage.key} className="overflow-hidden rounded-xl border">
          {/* Stage header (yellow-ish) */}
          <div className="flex items-center justify-between gap-3 bg-primary/10 px-4 py-2.5">
            <h3 className="font-semibold">{stage.name}</h3>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {fmt(stageProgress(stage, map))}{" "}
              <span className="font-normal text-muted-foreground">/ bobot {fmt(stageBobot(stage))}</span>
            </span>
          </div>

          {stage.items.map((sub) => (
            <div key={sub.key} className="border-t">
              {/* Sub-stage header (blue-ish) */}
              <div className="flex items-center justify-between gap-3 bg-sky-500/10 px-4 py-2">
                <h4 className="text-sm font-medium">{sub.name}</h4>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {fmt(subStageProgress(sub, map))} / {fmt(subStageBobot(sub))}
                </span>
              </div>

              {/* Items */}
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
                    <div className="flex w-28 shrink-0 items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        inputMode="decimal"
                        disabled={!canEdit || pending}
                        value={map[item.key] ?? ""}
                        placeholder="0"
                        onChange={(e) => setItem(item.key, e.target.value)}
                        className="h-8 text-right"
                        aria-label={`Persen penyelesaian ${item.name}`}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
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

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Menyimpan…" : "Simpan Realisasi"}
          </Button>
        </div>
      )}
    </div>
  );
}
