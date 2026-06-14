import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/constants";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Empty = all roles. */
  roles?: UserRole[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Utama",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Proyek", href: "/projects", icon: FolderKanban },
      { title: "Dokumen", href: "/documents", icon: FileText },
      {
        title: "Invoice",
        href: "/invoices",
        icon: Receipt,
        roles: ["super_admin", "project_manager", "client"],
      },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Pencarian", href: "/search", icon: Search },
      { title: "AI Assistant", href: "/assistant", icon: Sparkles },
      { title: "Notifikasi", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Administrasi",
    items: [
      {
        title: "Clients",
        href: "/clients",
        icon: Building2,
        roles: ["super_admin", "project_manager"],
      },
      {
        title: "Pengguna",
        href: "/users",
        icon: Users,
        roles: ["super_admin"],
      },
      { title: "Pengaturan", href: "/settings", icon: Settings },
    ],
  },
];

/** Filter nav sections/items by role. */
export function navForRole(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(role)
    ),
  })).filter((section) => section.items.length > 0);
}
