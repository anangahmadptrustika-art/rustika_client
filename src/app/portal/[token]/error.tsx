"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Gagal memuat halaman</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Terjadi kendala saat memuat data proyek. Silakan coba lagi.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Button asChild variant="outline">
          <Link href="..">Kembali</Link>
        </Button>
      </div>
    </div>
  );
}
