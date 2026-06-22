"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ClipboardList, Search } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem } from "@/components/motion/motion-primitives";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";
import type { ProjectWithRelations } from "@/types/database";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ClientGroup {
  id: string;
  name: string;
  projects: ProjectWithRelations[];
}

export function RealisasiBrowser({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  const [query, setQuery] = useState("");
  // Folders start collapsed — only client names show until clicked open.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.client?.name ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();
    for (const p of filtered) {
      const id = p.client_id ?? "none";
      const name = p.client?.name ?? "Tanpa Client";
      if (!map.has(id)) map.set(id, { id, name, projects: [] });
      map.get(id)!.projects.push(p);
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        projects: [...g.projects].sort((a, b) =>
          a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // When searching, auto-open folders so matches are visible.
  const forceOpen = query.trim() !== "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama proyek, kode, atau client…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} proyek dalam {groups.length} client
          {!forceOpen && groups.length > 0 && (
            <span className="ml-1 text-xs">· ketuk client untuk membuka</span>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada proyek"
          description="Tidak ada proyek yang cocok dengan pencarian Anda."
        />
      ) : (
        <Stagger className="space-y-4">
          {groups.map((group) => {
            const isOpen = forceOpen || expanded.has(group.id);
            return (
              <StaggerItem
                key={group.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <motion.button
                  whileTap={{ scale: 0.995 }}
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
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-90"
                    )}
                  />
                </motion.button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y border-t">
                        {group.projects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/realisasi/${p.id}`}
                            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">{p.name}</span>
                                <ProjectStatusBadge status={p.status} />
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{p.code}</p>
                            </div>
                            <div className="hidden w-40 shrink-0 sm:block">
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-muted-foreground">Realisasi</span>
                                <span className="font-semibold">{p.progress}%</span>
                              </div>
                              <Progress value={Number(p.progress)} />
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
