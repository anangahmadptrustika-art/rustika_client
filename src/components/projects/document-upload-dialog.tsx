"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  type DocumentCategory,
} from "@/lib/constants";
import { createUploadParams } from "@/app/(app)/projects/[id]/storage-actions";
import { cn, formatBytes } from "@/lib/utils";

export function DocumentUploadDialog({
  projectId,
  category,
  subcategories,
  fixedSubcategory,
  label = "Upload Dokumen",
}: {
  projectId: string;
  category: DocumentCategory;
  subcategories?: readonly string[];
  /** Force a single subcategory (no dropdown shown). Takes priority. */
  fixedSubcategory?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [subcategory, setSubcategory] = useState(fixedSubcategory ?? "");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFiles([]);
    setSubcategory(fixedSubcategory ?? "");
    setDescription("");
    setDone(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast.error("Pilih file terlebih dahulu.");
      return;
    }
    if (subcategories && subcategories.length > 0 && !subcategory) {
      toast.error("Pilih kategori dokumen.");
      return;
    }
    setUploading(true);
    setDone(0);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesi berakhir. Silakan login ulang.");
        return;
      }

      let ok = 0;
      let fail = 0;
      let tooBig = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > MAX_UPLOAD_BYTES) {
          tooBig++;
          fail++;
          setDone(i + 1);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

        // 1. Get a signed Cloudinary payload, 2. upload the file straight to
        // Cloudinary (same-origin server action + CORS-friendly upload = no
        // CORS config needed).
        const signed = await createUploadParams({
          kind: "document",
          projectId,
          category,
          filename: file.name,
        });
        if (!signed.ok) {
          fail++;
          setDone(i + 1);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId);
        form.append("signature", signed.signature);
        const up = await fetch(signed.uploadUrl, { method: "POST", body: form });
        if (!up.ok) {
          fail++;
          setDone(i + 1);
          continue;
        }
        const result = (await up.json()) as { public_id: string; secure_url: string };

        const docName = file.name;
        const { count } = await supabase
          .from("project_documents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("name", docName);

        const { error: insErr } = await supabase.from("project_documents").insert({
          project_id: projectId,
          category,
          subcategory: subcategory || null,
          name: docName,
          file_path: result.public_id,
          file_url: result.secure_url,
          file_type: ext,
          file_size: file.size,
          version: (count ?? 0) + 1,
          description: description.trim() || null,
          storage: "cloudinary",
          uploaded_by: user.id,
        });
        if (insErr) fail++;
        else ok++;
        setDone(i + 1);
      }

      // One summary activity for the batch.
      if (ok > 0) {
        await supabase.from("activities").insert({
          project_id: projectId,
          user_id: user.id,
          type: "upload",
          entity_type: "document",
          description:
            ok === 1
              ? `mengunggah dokumen "${files[0].name}"`
              : `mengunggah ${ok} dokumen`,
        });
      }

      const overMsg = tooBig
        ? ` ${tooBig} file melebihi batas ${MAX_UPLOAD_MB} MB.`
        : "";

      if (ok > 0) {
        toast.success(
          `${ok} file berhasil diunggah${fail ? `, ${fail} gagal.` : "."}${overMsg}`
        );
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(`Gagal mengunggah file.${overMsg}`);
      }
    } catch (e) {
      toast.error("Terjadi kesalahan: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (uploading) return;
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Pilih satu atau banyak file sekaligus. Maks {MAX_UPLOAD_MB} MB per file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File (bisa pilih banyak) *</Label>
            <input
              ref={inputRef}
              id="file"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5 rounded-lg border p-2">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {files.length} file dipilih · {formatBytes(totalSize)}
              </p>
              <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "text-xs",
                          f.size > MAX_UPLOAD_BYTES
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatBytes(f.size)}
                        {f.size > MAX_UPLOAD_BYTES ? ` · maks ${MAX_UPLOAD_MB}MB` : ""}
                      </span>
                      {!uploading && (
                        <button
                          onClick={() => removeFile(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Hapus dari daftar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!fixedSubcategory && subcategories && subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategori * (berlaku untuk semua file)</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="docdesc">Deskripsi (opsional, berlaku untuk semua)</Label>
            <Textarea
              id="docdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan / keterangan…"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={files.length ? (done / files.length) * 100 : 0} />
              <p className="text-center text-xs text-muted-foreground">
                Mengunggah {done}/{files.length}…
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Batal
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Mengunggah…" : `Unggah ${files.length || ""} File`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
