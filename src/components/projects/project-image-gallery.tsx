"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { deleteProjectImage } from "@/app/(app)/projects/[id]/actions";
import { formatDate } from "@/lib/utils";
import type { ProjectImage } from "@/types/database";

export function ProjectImageGallery({
  images,
  projectId,
  canDelete,
}: {
  images: ProjectImage[];
  projectId: string;
  canDelete: boolean;
}) {
  const [active, setActive] = useState<ProjectImage | null>(null);
  const router = useRouter();

  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="Belum ada foto"
        description="Foto dokumentasi yang diunggah akan tampil dalam galeri ini."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <figure
            key={img.id}
            className="group relative overflow-hidden rounded-xl border bg-card"
          >
            <button
              onClick={() => setActive(img)}
              className="block aspect-[4/3] w-full overflow-hidden bg-muted"
              aria-label="Preview foto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file_url ?? ""}
                alt={img.title ?? "Foto proyek"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </button>
            {canDelete && (
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <ConfirmDeleteDialog
                  title="Hapus foto ini?"
                  description={`"${img.title ?? "Foto"}" akan dihapus permanen.`}
                  trigger={
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Hapus foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  }
                  action={() =>
                    deleteProjectImage({ imageId: img.id, projectId, filePath: img.file_path })
                  }
                  onDone={() => router.refresh()}
                />
              </div>
            )}
            <figcaption className="space-y-2 p-3">
              <p className="truncate text-sm font-medium">{img.title ?? "Tanpa judul"}</p>
              <div className="flex flex-wrap gap-1">
                {img.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    #{tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(img.taken_at ?? img.created_at)}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="h-[88vh] max-w-5xl gap-0 bg-black/90 p-0">
          <DialogHeader className="border-b border-white/10 px-4 py-3">
            <DialogTitle className="truncate pr-8 text-base text-white">
              {active?.title ?? "Foto"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            {active?.file_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.file_url}
                alt={active.title ?? "Foto"}
                className="mx-auto max-h-[78vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
