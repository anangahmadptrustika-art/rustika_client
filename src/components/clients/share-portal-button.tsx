"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SharePortalButton({
  token,
  clientName,
}: {
  token: string | null;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!token) {
    return (
      <Button variant="outline" size="sm" disabled title="Jalankan migrasi portal dulu">
        <QrCode className="h-4 w-4" /> QR
      </Button>
    );
  }

  const url = `${origin}/portal/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link portal disalin.");
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `QR-${clientName.replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4" /> QR Portal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>QR Portal — {clientName}</DialogTitle>
          <DialogDescription>
            Bagikan QR / link ini ke client. Mereka cukup memindai untuk melihat
            proyeknya — <b>tanpa login</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="rounded-xl border bg-white p-4">
            {origin && (
              <QRCodeCanvas value={url} size={200} level="M" includeMargin />
            )}
          </div>

          <div className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span className="truncate text-xs text-muted-foreground">{url}</span>
            <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 shrink-0" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={downloadQr}>
              <Download className="h-4 w-4" /> Unduh QR
            </Button>
            <Button asChild className="flex-1">
              <a href={url} target="_blank" rel="noreferrer">
                Buka Portal
              </a>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            ⚠️ Siapa pun dengan link ini dapat melihat proyek {clientName}. Bagikan
            hanya kepada client terkait.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
