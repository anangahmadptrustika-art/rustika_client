import Link from "next/link";
import { CalendarDays, MapPin, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import type { ProjectWithRelations } from "@/types/database";

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {project.code}
              </p>
              <h3 className="truncate font-semibold group-hover:text-primary">
                {project.name}
              </h3>
            </div>
            <ProjectStatusBadge status={project.status} />
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{project.client?.name ?? "—"}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{project.location ?? "—"}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(project.start_date)} – {formatDate(project.end_date)}
            </p>
          </div>

          <div className="mt-auto">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
