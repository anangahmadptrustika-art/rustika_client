import { Download, Ruler } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber } from "@/lib/utils";
import type { AreaData } from "@/types/database";

export function AreaDataSection({ data }: { data: AreaData | null }) {
  if (!data) {
    return (
      <EmptyState
        icon={Ruler}
        title="Belum ada data luasan"
        description="Data luasan site, bangunan, dan koefisien bangunan akan tampil di sini."
      />
    );
  }

  const rows: { label: string; value: string; unit?: string }[] = [
    { label: "Luas Site", value: formatNumber(data.luas_site), unit: "m²" },
    { label: "Luas Bangunan", value: formatNumber(data.luas_bangunan), unit: "m²" },
    { label: "Luas Lantai (Total)", value: formatNumber(data.luas_lantai), unit: "m²" },
    { label: "KDB (Koef. Dasar Bangunan)", value: `${data.kdb ?? "-"}`, unit: "%" },
    { label: "KLB (Koef. Lantai Bangunan)", value: `${data.klb ?? "-"}` },
    { label: "KDH (Koef. Daerah Hijau)", value: `${data.kdh ?? "-"}`, unit: "%" },
    { label: "GSB (Garis Sempadan Bangunan)", value: `${data.gsb ?? "-"}`, unit: "m" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Data Luasan</CardTitle>
          <CardDescription>Ringkasan luasan & koefisien bangunan</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="font-semibold">
                {row.value}
                {row.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{row.unit}</span>}
              </span>
            </div>
          ))}
        </div>
        {data.notes && (
          <p className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <b>Catatan:</b> {data.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
