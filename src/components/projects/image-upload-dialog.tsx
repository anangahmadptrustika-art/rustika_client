"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
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
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ImageCategory>("progress");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setTitle("");
    setTags("");
    setCategory("progress");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih foto terlebih dahulu.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesi berakhir. Silakan login ulang.");
        return;
      }

      const path = `${projectId}/${category}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKETS.images)
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error("Gagal mengunggah foto: " + upErr.message);
        return;
      }

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error: insErr } = await supabase.from("project_images").insert({
        project_id: projectId,
        category,
        title: title.trim() || file.name,
        file_path: path,
        file_size: file.size,
        tags: tagList.length ? tagList : null,
        taken_at: new Date().toISOString(),
        uploaded_by: user.id,
      });
      if (insErr) {
        toast.error("Foto terunggah, tetapi gagal mencatat ke database: " + insErr.message);
        return;
      }

      await supabase.from("activities").insert({
        project_id: projectId,
        user_id: user.id,
        type: "upload",
        entity_type: "image",
        description: `mengunggah foto "${title.trim() || file.name}"`,
      });

      toast.success("Foto berhasil diunggah.");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error("Terjadi kesalahan: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <ImagePlus className="h-4 w-4" /> Upload Foto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Foto</DialogTitle>
          <DialogDescription>
            Foto dokumentasi disimpan aman di Supabase Storage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="img">Foto *</Label>
            <input
              ref={inputRef}
              id="img"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
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
            <Label htmlFor="imgtitle">Judul</Label>
            <Input
              id="imgtitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Keterangan foto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imgtags">Tag (pisahkan dengan koma)</Label>
            <Input
              id="imgtags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cth. lahan, eksisting, utara"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Batal
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Mengunggah…" : "Unggah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
