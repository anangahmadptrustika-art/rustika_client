import { requireProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const notifications = await getNotifications(profile.id);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header profile={profile} notifications={notifications} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
