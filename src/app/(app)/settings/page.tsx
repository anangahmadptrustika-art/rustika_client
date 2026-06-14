import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PERMISSION_MATRIX } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Profil akun dan referensi hak akses." />

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Informasi akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-lg text-primary">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permission Matrix</CardTitle>
          <CardDescription>
            Matriks hak akses per peran — ditegakkan di UI dan Row Level Security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fitur</TableHead>
                <TableHead className="text-center">Super Admin</TableHead>
                <TableHead className="text-center">Project Manager</TableHead>
                <TableHead className="text-center">Staff</TableHead>
                <TableHead className="text-center">Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  <Cell value={row.super_admin} />
                  <Cell value={row.project_manager} />
                  <Cell value={row.staff} />
                  <Cell value={row.client} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Cell({ value }: { value: boolean }) {
  return (
    <TableCell className="text-center">
      {value ? (
        <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
      )}
    </TableCell>
  );
}
