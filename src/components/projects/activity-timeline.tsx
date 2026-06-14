import {
  FileUp,
  Gauge,
  LogIn,
  MessageSquare,
  Stamp,
  UserPlus,
  Receipt,
  FolderPlus,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/utils";
import type { Activity } from "@/types/database";
import type { ActivityType } from "@/lib/constants";

const ICONS: Record<ActivityType, LucideIcon> = {
  upload: FileUp,
  progress: Gauge,
  approval: Stamp,
  comment: MessageSquare,
  login: LogIn,
  project: FolderPlus,
  invoice: Receipt,
  member: UserPlus,
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="Belum ada aktivitas"
        description="Semua aktivitas proyek akan tercatat di sini, terbaru di atas."
      />
    );
  }

  return (
    <ol className="relative space-y-5 border-l pl-6">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? Gauge;
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm">
              <span className="font-medium">Tim</span> {a.description}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
