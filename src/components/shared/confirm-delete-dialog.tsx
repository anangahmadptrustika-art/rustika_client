"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
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

/**
 * Generic confirmation dialog for destructive actions. `action` is a server
 * action (or any async fn) returning { ok, message }; `onDone` runs on success.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  confirmLabel = "Hapus",
  trigger,
  action,
  onDone,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  trigger: React.ReactNode;
  action: () => Promise<{ ok: boolean; message: string }>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        onDone?.();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
