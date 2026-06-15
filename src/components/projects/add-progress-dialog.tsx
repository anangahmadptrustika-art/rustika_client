"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { addProgressReport } from "@/app/(app)/projects/[id]/actions";

export function AddProgressDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await addProgressReport(formData);
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
          <Plus className="h-4 w-4" /> Tambah Laporan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Laporan Progress</DialogTitle>
          <DialogDescription>
            Persentase proyek otomatis mengikuti laporan terbaru.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report_date">Tanggal *</Label>
              <Input
                id="report_date"
                name="report_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress_percent">Progress (%) *</Label>
              <Input
                id="progress_percent"
                name="progress_percent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="0–100 (boleh desimal)"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="division">Divisi</Label>
            <Input id="division" name="division" placeholder="cth. Arsitektur, Struktur, SIMBG" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi Pekerjaan</Label>
            <Textarea id="description" name="description" placeholder="Apa yang dikerjakan…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="obstacle">Kendala</Label>
              <Textarea id="obstacle" name="obstacle" placeholder="Kendala (opsional)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solution">Solusi</Label>
              <Textarea id="solution" name="solution" placeholder="Solusi (opsional)" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
