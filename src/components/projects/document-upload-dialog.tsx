"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setName("");
    setSubcategory("");
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file terlebih dahulu.");
      return;
    }
    if (subcategories && subcategories.length > 0 && !subcategory) {
      toast.error("Pilih kategori dokumen.");
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

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const path = `${projectId}/${category}/${Date.now()}-${sanitize(file.name)}`;

      // 1. Upload file to Supabase Storage (respects RLS storage policies).
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKETS.documents)
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error("Gagal mengunggah file: " + upErr.message);
        return;
      }

      // 2. Version control — increment based on same-named docs.
      const docName = name.trim() || file.name;
      const { count } = await supabase
        .from("project_documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("name", docName);

      // 3. Record the document row.
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
      if (insErr) {
        toast.error("File terunggah, tetapi gagal mencatat ke database: " + insErr.message);
        return;
      }

      toast.success("Dokumen berhasil diunggah.");
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
          <Upload className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            File disimpan aman di Supabase Storage dengan kontrol akses & version.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <input
              ref={inputRef}
              id="file"
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name) setName(f.name);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          {subcategories && subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategori *</Label>
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
            <Label htmlFor="docname">Nama Dokumen</Label>
            <Input
              id="docname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama tampil dokumen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="docdesc">Deskripsi</Label>
            <Textarea
              id="docdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan / keterangan (opsional)…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Batal
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Mengunggah…" : "Unggah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
