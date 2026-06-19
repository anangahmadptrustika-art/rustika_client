import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  Gauge,
  Receipt,
  Stamp,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  getActivities,
  getDashboardStats,
  getProgressAnalytics,
  getProjects,
} from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressAreaChart } from "@/components/charts/progress-area-chart";
import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { DivisionBarChart } from "@/components/charts/division-bar-chart";
import { ProjectMap } from "@/components/charts/project-map";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, StaggerItem } from "@/components/motion/motion-primitives";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { canViewFinance } from "@/lib/rbac";
import { formatCurrency, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [stats, projects, activities, analytics] = await Promise.all([
    getDashboardStats(),
    getProjects(),
    getActivities(),
    getProgressAnalytics(),
  ]);

  const showFinance = canViewFinance(profile.role);

  const statusData = PROJECT_STATUSES.map((s) => ({
    name: PROJECT_STATUS_LABELS[s],
    value: projects.filter((p) => p.status === s).length,
  }));

  // Plot each project at its stored coordinate (filled from the sheet sync).
  const mapPoints = projects
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.latitude as number,
      lng: p.longitude as number,
      location: p.location,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${profile.full_name.split(" ")[0]} 👋`}
        description={`Ringkasan proyek Anda sebagai ${ROLE_LABELS[profile.role]}.`}
      />

      {/* Stat cards */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StaggerItem>
          <StatCard label="Total Project" value={stats.totalProjects} icon={FolderKanban} accent="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Active Project" value={stats.activeProjects} icon={ActivityIcon} accent="default" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Completed" value={stats.completedProjects} icon={CheckCircle2} accent="success" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Avg. Progress" value={`${stats.averageProgress}%`} icon={Gauge} accent="primary" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Pending Approval" value={stats.pendingApproval} icon={Stamp} accent="warning" />
        </StaggerItem>
        <StaggerItem>
          {showFinance ? (
            <StatCard
              label="Outstanding Invoice"
              value={formatCurrency(stats.outstandingInvoice)}
              icon={Receipt}
              accent="danger"
            />
          ) : (
            <StatCard label="Aktivitas" value={activities.length} icon={Clock} accent="default" />
          )}
        </StaggerItem>
      </Stagger>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress Bulanan</CardTitle>
            <CardDescription>Rata-rata progres seluruh proyek per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressAreaChart data={analytics.monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Proyek</CardTitle>
            <CardDescription>Distribusi proyek per status</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Belum ada proyek untuk ditampilkan.
              </p>
            ) : (
              <StatusBarChart data={statusData} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sebaran Proyek — Sulawesi Selatan</CardTitle>
          <CardDescription>
            Lokasi proyek berdasarkan titik koordinat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectMap points={mapPoints} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Progress per Divisi</CardTitle>
            <CardDescription>Capaian tiap divisi pekerjaan</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.divisions.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Belum ada laporan progress per divisi.
              </p>
            ) : (
              <DivisionBarChart data={analytics.divisions} />
            )}
          </CardContent>
        </Card>

        {/* Recent projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Proyek Terbaru</CardTitle>
              <CardDescription>Proyek yang baru diperbarui</CardDescription>
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Lihat semua <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada proyek. Klik menu <b>Proyek</b> untuk membuat yang pertama.
              </p>
            )}
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.name}</p>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.code} · {p.client?.name}
                  </p>
                </div>
                <div className="hidden w-32 shrink-0 sm:block">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>Linimasa aktivitas seluruh proyek</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Belum ada aktivitas"
              description="Aktivitas akan muncul saat tim mulai mengunggah dokumen dan memperbarui progress."
            />
          ) : (
          <ul className="space-y-4">
            {activities.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Tim</span> {a.description}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
