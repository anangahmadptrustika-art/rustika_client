import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProjectById } from "@/lib/queries";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { RealisasiEditor } from "@/components/realisasi/realisasi-editor";
import { sanitizeRealisasiMap } from "@/lib/realisasi-template";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  return { title: `Realisasi — ${project?.name ?? "Proyek"}` };
}

export default async function RealisasiEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const profile = await requireRole(["super_admin", "project_manager", "staff"]);

  const project = await getProjectById(projectId);
  if (!project) notFound();

  const canEdit = can(profile.role, "progress:update");
  const initial = sanitizeRealisasiMap(project.realisasi);

  return (
    <div className="space-y-6">
      <Link
        href="/realisasi"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar realisasi
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{project.code}</span>
            <ProjectStatusBadge status={project.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Laporan Realisasi Progres · {project.client?.name}
          </p>
        </div>
      </div>

      <RealisasiEditor projectId={projectId} initial={initial} canEdit={canEdit} />
    </div>
  );
}
