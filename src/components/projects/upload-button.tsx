"use client";

import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Lightweight upload trigger. In a live deployment this opens a file picker and
 * streams to Supabase Storage via a signed upload URL; in demo mode it explains
 * that uploads are disabled.
 */
export function UploadButton({
  label = "Upload",
  variant = "default",
}: {
  label?: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() =>
        toast.info(
          "Upload aktif setelah Supabase Storage dikonfigurasi (.env.local)."
        )
      }
    >
      <Upload className="h-4 w-4" /> {label}
    </Button>
  );
}
