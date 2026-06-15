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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addInvoice } from "@/app/(app)/projects/[id]/actions";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/constants";

export function AddInvoiceDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await addInvoice(formData);
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
          <Plus className="h-4 w-4" /> Tambah Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Invoice</DialogTitle>
          <DialogDescription>Buat tagihan / termin untuk proyek ini.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">No. Invoice *</Label>
              <Input id="invoice_number" name="invoice_number" placeholder="INV/RC/2026/00X" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termin">Termin</Label>
              <Input id="termin" name="termin" placeholder="cth. Termin 1 (DP 30%)" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Nilai (IDR) *</Label>
            <Input id="amount" name="amount" type="number" min={0} step="0.01" placeholder="0,00" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Tanggal Terbit</Label>
              <Input id="issue_date" name="issue_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Jatuh Tempo</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select name="status" defaultValue="draft">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INVOICE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
