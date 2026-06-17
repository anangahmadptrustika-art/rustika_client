import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getClients, getProjects } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

export const metadata: Metadata = { title: "Proyek" };

export default async function ProjectsPage() {
  const profile = await requireProfile();
  const [projects, clients] = await Promise.all([getProjects(), getClients()]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Proyek"
        description="Seluruh proyek konsultan, arsitektur, sipil, survey, dan SIMBG."
        className="mb-4 shrink-0"
      >
        {can(profile.role, "project:create") && (
          <NewProjectDialog clients={clients} />
        )}
      </PageHeader>
      <ProjectsBrowser projects={projects} />
    </div>
  );
}
