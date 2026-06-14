import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getProfiles } from "@/lib/queries";
import { isSuperAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ROLE_LABELS,
  STAFF_CATEGORY_LABELS,
} from "@/lib/constants";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage() {
  const profile = await requireProfile();
  if (!isSuperAdmin(profile.role)) redirect("/dashboard");

  const users = await getProfiles();

  return (
    <div>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun, peran, dan status pengguna portal."
      />
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/15 text-xs text-primary">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.email}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.staff_category
                    ? STAFF_CATEGORY_LABELS[u.staff_category]
                    : "—"}
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline">Nonaktif</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
