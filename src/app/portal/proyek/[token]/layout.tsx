import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoWordmark } from "@/components/brand/logo";
import { getProjectByShareToken } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Portal Proyek",
  robots: { index: false, follow: false },
};

export default async function PortalProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await getProjectByShareToken(token);
  if (!project) notFound();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <LogoWordmark />
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold leading-tight">{project.name}</p>
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
