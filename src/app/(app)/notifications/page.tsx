import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const notifications = await getNotifications(profile.id);

  return (
    <div>
      <PageHeader
        title="Notification Center"
        description="Dokumen baru, perubahan progres, approval, invoice, dan komentar."
      />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Tidak ada notifikasi" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link key={n.id} href={n.link ?? "#"}>
              <Card className={n.is_read ? "" : "border-primary/30 bg-primary/5"}>
                <CardContent className="flex items-start gap-4 p-4">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      n.is_read ? "bg-muted-foreground/30" : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.is_read && (
                        <Badge variant="secondary" className="text-[10px]">
                          Baru
                        </Badge>
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
