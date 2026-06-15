"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMAGE_CATEGORIES,
  IMAGE_CATEGORY_LABELS,
  STORAGE_BUCKETS,
  type ImageCategory,
} from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ImageUploadDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<ImageCategory>("progress");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFiles([]);
    setTags("");
    setCategory("progress");
    setDone(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast.error("Pilih foto terlebih dahulu.");
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

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let ok = 0;
      let fail = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${projectId}/${category}/${Date.now()}-${i}-${sanitize(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKETS.images)
          .upload(path, file, { upsert: false });
        if (upErr) {
          fail++;
          setDone(i + 1);
          continue;
        }
        const { error: insErr } = await supabase.from("project_images").insert({
          project_id: projectId,
          category,
          title: file.name,
          file_path: path,
          file_size: file.size,
          tags: tagList.length ? tagList : null,
          taken_at: new Date().toISOString(),
          uploaded_by: user.id,
        });
        if (insErr) fail++;
        else ok++;
        setDone(i + 1);
      }

      if (ok > 0) {
        await supabase.from("activities").insert({
          project_id: projectId,
          user_id: user.id,
          type: "upload",
          entity_type: "image",
          description: ok === 1 ? `mengunggah foto "${files[0].name}"` : `mengunggah ${ok} foto`,
        });
        toast.success(`${ok} foto berhasil diunggah${fail ? `, ${fail} gagal` : ""}.`);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error("Gagal mengunggah foto.");
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
          <ImagePlus className="h-4 w-4" /> Upload Foto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Foto</DialogTitle>
          <DialogDescription>
            Pilih satu atau banyak foto sekaligus. Disimpan aman di Supabase Storage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="img">Foto (bisa pilih banyak) *</Label>
            <input
              ref={inputRef}
              id="img"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5 rounded-lg border p-2">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {files.length} foto dipilih · {formatBytes(totalSize)}
              </p>
              <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
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

          <div className="space-y-2">
            <Label>Kategori (berlaku untuk semua)</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ImageCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {IMAGE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imgtags">Tag (pisahkan dengan koma, berlaku untuk semua)</Label>
            <Input
              id="imgtags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cth. lahan, eksisting, utara"
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
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Mengunggah…" : `Unggah ${files.length || ""} Foto`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
