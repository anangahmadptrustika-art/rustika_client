"use client";

import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, List, Search } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { ProjectWithRelations } from "@/types/database";

export function ProjectsBrowser({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.client?.name ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || p.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, status]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama proyek, kode, client, lokasi…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border p-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Menampilkan {filtered.length} dari {projects.length} proyek
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Tidak ada proyek"
          description="Tidak ada proyek yang cocok dengan filter Anda."
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={cn(
                "flex items-center gap-4 p-4 transition-colors hover:bg-accent",
                i !== 0 && "border-t"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <ProjectStatusBadge status={p.status} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.code} · {p.client?.name} · {p.location}
                </p>
              </div>
              <p className="hidden text-xs text-muted-foreground md:block">
                {formatDate(p.end_date)}
              </p>
              <div className="hidden w-36 shrink-0 sm:block">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{p.progress}%</span>
                </div>
                <Progress value={p.progress} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
