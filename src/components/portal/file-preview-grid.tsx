"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  File as FileIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatBytes } from "@/lib/utils";

export interface PreviewItem {
  id: string;
  name: string;
  url: string | null;
  kind: "image" | "pdf" | "office" | "other";
  size?: number | null;
  badge?: string | null;
  version?: number;
}

function iconFor(kind: PreviewItem["kind"]) {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "pdf":
      return FileText;
    case "office":
      return FileSpreadsheet;
    default:
      return FileIcon;
  }
}

export function FilePreviewGrid({
  items,
  emptyLabel = "Belum ada file.",
}: {
  items: PreviewItem[];
  emptyLabel?: string;
}) {
  const [active, setActive] = useState<PreviewItem | null>(null);

  if (items.length === 0) {
    return <EmptyState icon={FileText} title={emptyLabel} className="py-8" />;
  }

  const canPreview = (it: PreviewItem) =>
    !!it.url && (it.kind === "image" || it.kind === "pdf");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => {
          const Icon = iconFor(it.kind);
          return (
            <button
              key={it.id}
              onClick={() => (canPreview(it) ? setActive(it) : it.url && window.open(it.url, "_blank"))}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                {it.kind === "image" && it.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.url}
                    alt={it.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Icon className="h-10 w-10 text-muted-foreground" />
                )}
                {canPreview(it) && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <Eye className="h-6 w-6" />
                  </span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium">{it.name}</p>
                <div className="flex items-center gap-1.5">
                  {it.badge && (
                    <Badge variant="secondary" className="text-[10px]">
                      {it.badge}
                    </Badge>
                  )}
                  {typeof it.version === "number" && (
                    <Badge variant="outline" className="text-[10px]">
                      v{it.version}
                    </Badge>
                  )}
                  {it.size ? (
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(it.size)}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="h-[88vh] max-w-5xl gap-0 p-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <DialogTitle className="truncate pr-8 text-base">{active?.name}</DialogTitle>
            {active?.url && (
              <Button asChild variant="outline" size="sm" className="mr-6 shrink-0">
                <a href={active.url} target="_blank" rel="noreferrer" download>
                  <Download className="h-4 w-4" /> Unduh
                </a>
              </Button>
            )}
          </DialogHeader>
          <div className={cn("flex-1 overflow-auto", active?.kind === "image" ? "bg-black/90 p-4" : "")}>
            {active?.kind === "pdf" && active.url && (
              <iframe src={active.url} title={active.name} className="h-full min-h-[70vh] w-full" />
            )}
            {active?.kind === "image" && active.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.name}
                className="mx-auto max-h-[78vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Maps a file extension to a preview kind. */
export function kindFromType(type: string | null | undefined): PreviewItem["kind"] {
  const t = (type ?? "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(t)) return "image";
  if (t === "pdf") return "pdf";
  if (["doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx"].includes(t)) return "office";
  return "other";
}
