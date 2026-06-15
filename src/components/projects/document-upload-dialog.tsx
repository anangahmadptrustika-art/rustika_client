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
import { STORAGE_BUCKETS, type DocumentCategory } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function DocumentUploadDialog({
  projectId,
  category,
  subcategories,
  label = "Upload Dokumen",
}: {
  projectId: string;
  category: DocumentCategory;
  subcategories?: readonly string[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFiles([]);
    setSubcategory("");
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const path = `${projectId}/${category}/${Date.now()}-${i}-${sanitize(file.name)}`;

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKETS.documents)
          .upload(path, file, { upsert: false });
        if (upErr) {
          fail++;
          setDone(i + 1);
          continue;
        }

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
          file_path: path,
          file_type: ext,
          file_size: file.size,
          version: (count ?? 0) + 1,
          description: description.trim() || null,
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

      if (ok > 0) {
        toast.success(`${ok} file berhasil diunggah${fail ? `, ${fail} gagal` : ""}.`);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error("Gagal mengunggah file.");
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
            Pilih satu atau banyak file sekaligus. Disimpan aman di Supabase Storage.
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
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(f.size)}
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

          {subcategories && subcategories.length > 0 && (
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
