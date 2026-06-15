"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { STORAGE_BUCKETS } from "@/lib/constants";

/** Generates a short-lived signed URL and opens it to download the file. */
export function DocumentDownloadButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.documents)
        .createSignedUrl(filePath, 120, { download: true });
      if (error || !data) {
        toast.error("Gagal membuat link unduhan.");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      toast.error("Terjadi kesalahan: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Download" onClick={download} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}
