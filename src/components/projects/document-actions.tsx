"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteDocument } from "@/app/(app)/projects/[id]/actions";
import { kindFromType } from "@/lib/file-kind";
import { STORAGE_BUCKETS } from "@/lib/constants";

export function DocumentActions({
  documentId,
  projectId,
  name,
  filePath,
  fileType,
  canDelete,
}: {
  documentId: string;
  projectId: string;
  name: string;
  filePath: string;
  fileType: string | null;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const kind = kindFromType(fileType);
  const canPreview = kind === "pdf" || kind === "image";

  async function signedUrl(download = false): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.documents)
      .createSignedUrl(filePath, 300, download ? { download: true } : undefined);
    if (error || !data) {
      toast.error("Gagal membuat link file.");
      return null;
    }
    return data.signedUrl;
  }

  async function preview() {
    setLoading(true);
    const u = await signedUrl(false);
    setLoading(false);
    if (u) {
      setUrl(u);
      setOpen(true);
    }
  }

  async function download() {
    setLoading(true);
    const u = await signedUrl(true);
    setLoading(false);
    if (u) window.open(u, "_blank");
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canPreview && (
        <Button
          variant="ghost"
          size="icon"
          onClick={preview}
          disabled={loading}
          aria-label="Preview"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={download}
        disabled={loading}
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </Button>
      {canDelete && (
        <ConfirmDeleteDialog
          title="Hapus dokumen ini?"
          description={`"${name}" akan dihapus permanen dari penyimpanan.`}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
          action={() => deleteDocument({ documentId, projectId, filePath })}
          onDone={() => router.refresh()}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[88vh] max-w-5xl gap-0 p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="truncate pr-8 text-base">{name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {kind === "pdf" && url && (
              <iframe src={url} title={name} className="h-full min-h-[70vh] w-full" />
            )}
            {kind === "image" && url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={name} className="mx-auto max-h-[80vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
