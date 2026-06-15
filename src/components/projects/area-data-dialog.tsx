"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ruler } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAreaData } from "@/app/(app)/projects/[id]/actions";
import type { AreaData } from "@/types/database";

const FIELDS: { name: keyof AreaData; label: string; unit?: string; step?: string }[] = [
  { name: "luas_site", label: "Luas Site", unit: "m²" },
  { name: "luas_bangunan", label: "Luas Bangunan", unit: "m²" },
  { name: "luas_lantai", label: "Luas Lantai (total)", unit: "m²" },
  { name: "kdb", label: "KDB", unit: "%" },
  { name: "klb", label: "KLB", step: "0.01" },
  { name: "kdh", label: "KDH", unit: "%" },
  { name: "gsb", label: "GSB", unit: "m" },
];

export function AreaDataDialog({
  projectId,
  data,
}: {
  projectId: string;
  data: AreaData | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await saveAreaData(formData);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Ruler className="h-4 w-4" /> {data ? "Edit Data Luasan" : "Isi Data Luasan"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Data Luasan</DialogTitle>
          <DialogDescription>
            Isi luasan & koefisien bangunan. Otomatis tampil di portal client.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.unit && <span className="ml-1 text-xs text-muted-foreground">({f.unit})</span>}
                </Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type="number"
                  step={f.step ?? "any"}
                  defaultValue={(data?.[f.name] as number | null) ?? ""}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={data?.notes ?? ""}
              placeholder="cth. sesuai ketentuan RTRW…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
