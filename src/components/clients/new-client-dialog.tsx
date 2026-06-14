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
import { createClientRecord } from "@/app/(app)/clients/actions";

export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createClientRecord(formData);
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
        <Button>
          <Plus className="h-4 w-4" /> Tambah Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Client Baru</DialogTitle>
          <DialogDescription>
            Lengkapi data client. Hanya nama yang wajib diisi.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Client *</Label>
            <Input id="name" name="name" placeholder="cth. PT Vale Indonesia" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Perusahaan</Label>
            <Input id="company" name="company" placeholder="Nama lengkap perusahaan" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@client.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" name="phone" placeholder="+62 ..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" name="address" placeholder="Alamat client…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
