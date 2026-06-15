"use client";

import { useState } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible "folder" for the client portal. Collapsed by default — the client
 * taps the folder name to reveal its contents (useful when a section holds many
 * files, e.g. SIMBG reports).
 */
export function PortalFolder({
  title,
  count,
  unit = "file",
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  unit?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {open ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          {typeof count === "number" && (
            <p className="text-xs text-muted-foreground">
              {count} {unit}
            </p>
          )}
        </div>
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </button>
      {open && <div className="animate-fade-in border-t p-4">{children}</div>}
    </div>
  );
}
