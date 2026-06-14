"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { createUser } from "@/app/(app)/users/actions";
import {
  ROLE_LABELS,
  STAFF_CATEGORIES,
  STAFF_CATEGORY_LABELS,
  USER_ROLES,
  type UserRole,
} from "@/lib/constants";
import type { Client } from "@/types/database";

export function NewUserDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("staff");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createUser(formData);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        setRole("staff");
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
          <UserPlus className="h-4 w-4" /> Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Akun dibuat & langsung aktif. Pengguna bisa login dengan email & password ini.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <Input id="full_name" name="full_name" placeholder="Nama pengguna" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="nama@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="text"
                placeholder="Min. 6 karakter"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Peran *</Label>
            <Select
              name="role"
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === "staff" && (
            <div className="space-y-2">
              <Label>Kategori Staff</Label>
              <Select name="staff_category" defaultValue="admin">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {STAFF_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "client" && (
            <div className="space-y-2">
              <Label>Tautkan ke Client *</Label>
              <Select name="client_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Belum ada client — tambahkan dulu di menu Clients.
                    </div>
                  )}
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Membuat…" : "Buat Pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
