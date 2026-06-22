import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProjects } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RealisasiBrowser } from "@/components/realisasi/realisasi-browser";

export const metadata: Metadata = { title: "Laporan Realisasi" };

export default async function RealisasiListPage() {
  await requireRole(["super_admin", "project_manager", "staff"]);
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Realisasi Progres"
        description="Pilih client untuk membuka, lalu pilih proyek untuk mengisi realisasinya. Total otomatis jadi progres proyek yang dilihat client."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada proyek"
          description="Proyek akan tampil di sini untuk diisi realisasinya."
        />
      ) : (
        <RealisasiBrowser projects={projects} />
      )}
    </div>
  );
}
