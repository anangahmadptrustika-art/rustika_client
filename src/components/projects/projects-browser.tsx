"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/constants";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { ProjectWithRelations } from "@/types/database";

interface ClientGroup {
  id: string;
  name: string;
  projects: ProjectWithRelations[];
}

export function ProjectsBrowser({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  // Group filtered projects by client (sorted by client name).
  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();
    for (const p of filtered) {
      const id = p.client_id ?? "none";
      const name = p.client?.name ?? "Tanpa Client";
      if (!map.has(id)) map.set(id, { id, name, projects: [] });
      map.get(id)!.projects.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Fixed toolbar */}
      <div className="shrink-0 space-y-3">
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
          {filtered.length} proyek dalam {groups.length} client
        </p>
      </div>

      {/* Scrollable project list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Tidak ada proyek"
          description="Tidak ada proyek yang cocok dengan filter Anda."
        />
      ) : (
        <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.id);
            return (
              <div key={group.id} className="overflow-hidden rounded-xl border bg-card">
                {/* Client header */}
                <button
                  onClick={() => toggle(group.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                    {getInitials(group.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.projects.length} proyek
                    </p>
                  </div>
                  <Badge variant="secondary">{group.projects.length}</Badge>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      !isCollapsed && "rotate-90"
                    )}
                  />
                </button>

                {!isCollapsed && (
                  <div className="border-t p-4">
                    {view === "grid" ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {group.projects.map((p) => (
                          <ProjectCard key={p.id} project={p} />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        {group.projects.map((p, i) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className={cn(
                              "flex items-center gap-4 p-3 transition-colors hover:bg-accent",
                              i !== 0 && "border-t"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">{p.name}</span>
                                <ProjectStatusBadge status={p.status} />
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {p.code} · {p.location}
                              </p>
                            </div>
                            <p className="hidden text-xs text-muted-foreground md:block">
                              {formatDate(p.end_date)}
                            </p>
                            <div className="hidden w-36 shrink-0 sm:block">
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-muted-foreground">{p.progress}%</span>
                              </div>
                              <Progress value={Number(p.progress)} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
