import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProjects } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { ProjectWithRelations } from "@/types/database";

export const metadata: Metadata = { title: "Laporan Realisasi" };

export default async function RealisasiListPage() {
  await requireRole(["super_admin", "project_manager", "staff"]);
  const projects = await getProjects();

  // Group by client for a tidy list.
  const groups = new Map<string, ProjectWithRelations[]>();
  for (const p of projects) {
    const key = p.client?.name ?? "Tanpa Client";
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  const clientNames = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Realisasi Progres"
        description="Isi persen penyelesaian tiap item (PBG/SLF). Total otomatis jadi progres proyek yang dilihat client."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada proyek"
          description="Proyek akan tampil di sini untuk diisi realisasinya."
        />
      ) : (
        <div className="space-y-6">
          {clientNames.map((name) => (
            <div key={name}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {name} ({groups.get(name)!.length})
              </h2>
              <div className="divide-y overflow-hidden rounded-xl border">
                {groups
                  .get(name)!
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((p) => (
                    <Link
                      key={p.id}
                      href={`/realisasi/${p.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{p.name}</p>
                          <ProjectStatusBadge status={p.status} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{p.code}</p>
                      </div>
                      <div className="hidden w-40 shrink-0 sm:block">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">Realisasi</span>
                          <span className="font-semibold">{p.progress}%</span>
                        </div>
                        <Progress value={p.progress} />
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
