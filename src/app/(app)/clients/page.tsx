import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getClients, getProjects } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { SharePortalButton } from "@/components/clients/share-portal-button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const profile = await requireProfile();
  if (!can(profile.role, "client:manage")) redirect("/dashboard");

  const [clients, projects] = await Promise.all([getClients(), getProjects()]);
  const projectCount = (clientId: string) =>
    projects.filter((p) => p.client_id === clientId).length;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Daftar seluruh client Rustika Consultant."
      >
        {can(profile.role, "client:manage") && <NewClientDialog />}
      </PageHeader>
      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada client"
          description="Tambahkan client pertama Anda untuk mulai membuat proyek."
          action={can(profile.role, "client:manage") ? <NewClientDialog /> : undefined}
        />
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {getInitials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{c.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.company}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {c.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> <span className="truncate">{c.email}</span>
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </p>
                )}
                {c.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{c.address}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {projectCount(c.id)} Proyek
                </span>
                <SharePortalButton token={c.share_token} clientName={c.name} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
