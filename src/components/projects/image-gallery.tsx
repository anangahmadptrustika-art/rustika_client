import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { ProjectImage } from "@/types/database";

export function ImageGallery({ images }: { images: ProjectImage[] }) {
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((img) => (
        <figure
          key={img.id}
          className="group overflow-hidden rounded-xl border bg-card"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.file_url ?? ""}
              alt={img.title ?? "Foto proyek"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
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
  );
}
