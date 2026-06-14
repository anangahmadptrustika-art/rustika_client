import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoWordmark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <LogoWordmark />
      <div>
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
