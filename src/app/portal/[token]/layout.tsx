import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoWordmark } from "@/components/brand/logo";
import { getClientByToken } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Portal Client",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <LogoWordmark />
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight">{client.name}</p>
            <p className="text-[11px] text-muted-foreground">Portal Proyek</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="border-t py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rustika Consultant — Laporan proyek digital
        </p>
      </footer>
    </div>
  );
}
