import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressAreaChart } from "@/components/charts/progress-area-chart";
import { formatDate } from "@/lib/utils";
import type { ProjectProgress } from "@/types/database";

export function ProgressSection({
  reports,
  currentProgress,
}: {
  reports: ProjectProgress[];
  currentProgress: number;
}) {
  const chartData = reports.map((r) => ({
    month: formatDate(r.report_date, { day: "2-digit", month: "short" }),
    progress: r.progress_percent,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Progress Saat Ini</CardTitle>
            <CardDescription>Akumulasi dari laporan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-4xl font-bold">{currentProgress}%</span>
              <Badge variant="secondary">{reports.length} laporan</Badge>
            </div>
            <Progress value={currentProgress} className="h-3" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress Chart</CardTitle>
            <CardDescription>Tren capaian dari waktu ke waktu</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ProgressAreaChart data={chartData} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Belum ada data progress.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 font-semibold">Progress Timeline</h3>
        {reports.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Belum ada laporan progress"
            description="Laporan progress mingguan akan tampil di sini."
          />
        ) : (
          <ol className="relative space-y-6 border-l pl-6">
            {[...reports].reverse().map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </span>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {r.division && <Badge variant="secondary">{r.division}</Badge>}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(r.report_date)}
                        </span>
                      </div>
                      <span className="font-semibold text-primary">
                        {r.progress_percent}%
                      </span>
                    </div>
                    <Progress value={r.progress_percent} />
                    {r.description && <p className="text-sm">{r.description}</p>}
                    {r.obstacle && (
                      <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <b>Kendala:</b> {r.obstacle}
                        </span>
                      </p>
                    )}
                    {r.solution && (
                      <p className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <b>Solusi:</b> {r.solution}
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
