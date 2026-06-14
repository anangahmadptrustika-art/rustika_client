import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import type { Notification, Profile } from "@/types/database";

export function Header({
  profile,
  notifications,
}: {
  profile: Profile;
  notifications: Notification[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <MobileNav role={profile.role} />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu notifications={notifications} />
        <div className="mx-2 hidden h-6 w-px bg-border sm:block" />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
