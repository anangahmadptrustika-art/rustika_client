import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FolderKanban, Gauge, CheckCircle2 } from "lucide-react";
import { getClientByToken, getPortalProjects } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem } from "@/components/motion/motion-primitives";
import { formatDate } from "@/lib/utils";

export default async function PortalHome({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const projects = await getPortalProjects(client.id);
  const active = projects.filter(
    (p) => p.status !== "completed" && p.status !== "on_hold"
  ).length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const avg =
    projects.length > 0
      ? Math.round(
          (projects.reduce((s, p) => s + Number(p.progress ?? 0), 0) /
            projects.length) *
            100
        ) / 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat datang, {client.name} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau seluruh progres proyek Anda bersama Rustika Consultant.
        </p>
      </div>

      <Stagger className="grid grid-cols-3 gap-3">
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <FolderKanban className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{projects.length}</span>
              <span className="text-xs text-muted-foreground">Total Proyek</span>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{avg}%</span>
              <span className="text-xs text-muted-foreground">Total Progres</span>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{completed}</span>
              <span className="text-xs text-muted-foreground">Selesai</span>
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Daftar Proyek ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Belum ada proyek"
            description="Proyek Anda akan tampil di sini begitu tim memulainya."
          />
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <StaggerItem key={p.id}>
              <Link href={`/portal/${token}/p/${p.id}`} className="group block">
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                        <h3 className="font-semibold group-hover:text-primary">{p.name}</h3>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.location} · s/d {formatDate(p.end_date)}
                    </p>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progres</span>
                        <span className="font-semibold">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} />
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-primary">
                      Lihat detail <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}
