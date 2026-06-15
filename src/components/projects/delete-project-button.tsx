"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteProject } from "@/app/(app)/projects/actions";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      title="Hapus proyek ini?"
      description="Semua dokumen, foto, progres, invoice, approval, dan diskusi pada proyek ini akan ikut terhapus secara permanen."
      confirmLabel="Hapus Proyek"
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" /> Hapus
        </Button>
      }
      action={() => deleteProject(projectId)}
      onDone={() => router.push("/projects")}
    />
  );
}
