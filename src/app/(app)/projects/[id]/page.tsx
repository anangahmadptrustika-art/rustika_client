import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  MapPin,
  Ruler,
  UserCog,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  getActivities,
  getApprovals,
  getAreaData,
  getClients,
  getComments,
  getInvoices,
  getProjectById,
  getProjectDocuments,
  getProjectImages,
  getProjectProgress,
} from "@/lib/queries";
import { canViewFinance, isClient } from "@/lib/rbac";
import { can } from "@/lib/rbac";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectTabs, type ProjectTabDef } from "@/components/projects/project-tabs";
import { DocumentTable } from "@/components/projects/document-table";
import { DocumentUploadDialog } from "@/components/projects/document-upload-dialog";
import { ImageUploadDialog } from "@/components/projects/image-upload-dialog";
import { ProjectImageGallery } from "@/components/projects/project-image-gallery";
import { ProgressSection } from "@/components/projects/progress-section";
import { AreaDataSection } from "@/components/projects/area-data-section";
import { InvoiceTable } from "@/components/projects/invoice-table";
import { ApprovalSection } from "@/components/projects/approval-section";
import { DiscussionThread } from "@/components/projects/discussion-thread";
import { ActivityTimeline } from "@/components/projects/activity-timeline";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { AddProgressDialog } from "@/components/projects/add-progress-dialog";
import { AddInvoiceDialog } from "@/components/projects/add-invoice-dialog";
import { AreaDataDialog } from "@/components/projects/area-data-dialog";
import { DRONE_SUBCATEGORIES, SIMBG_SUBCATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);
  return { title: project?.name ?? "Proyek" };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const profile = await requireProfile();

  const showFinance = canViewFinance(profile.role);
  const canEdit = can(profile.role, "document:upload");
  const canDeleteDoc = can(profile.role, "document:delete");
  const canEditProject = can(profile.role, "project:edit");

  // One parallel batch (co-located with the DB) instead of sequential queries.
  const [
    project,
    clients,
    allDocs,
    images,
    progress,
    area,
    invoices,
    approvals,
    comments,
    activities,
  ] = await Promise.all([
    getProjectById(id),
    getClients(),
    getProjectDocuments(id),
    getProjectImages(id),
    getProjectProgress(id),
    getAreaData(id),
    getInvoices(id),
    getApprovals(id),
    getComments(id),
    getActivities(id),
  ]);

  if (!project) notFound();

  const kajian = allDocs.filter((d) => d.category === "kajian_teknis");
  const simbg = allDocs.filter((d) => d.category === "simbg");
  const survey = allDocs.filter((d) => d.category === "survey");
  const drone = allDocs.filter((d) => d.category === "drone");
  const droneImages = images;

  // ── Tab definitions (finance hidden from staff) ──
  const tabs: ProjectTabDef[] = [
    { value: "overview", label: "Overview" },
    { value: "kajian", label: "Kajian Teknis" },
    { value: "simbg", label: "SIMBG Drawing" },
    { value: "survey", label: "Survey" },
    { value: "drone", label: "Drone Mapping" },
    { value: "images", label: "Capture Images" },
    { value: "area", label: "Data Luasan" },
    { value: "progress", label: "Progress Report" },
    { value: "timeline", label: "Timeline" },
    ...(showFinance ? [{ value: "invoice", label: "Invoice" }] : []),
    { value: "approval", label: "Approval" },
    { value: "discussion", label: "Discussion" },
  ];

  const meta = [
    { icon: Building2, label: "Client", value: project.client?.name ?? "—" },
    { icon: UserCog, label: "Project Manager", value: project.project_manager?.full_name ?? "—" },
    { icon: MapPin, label: "Lokasi", value: project.location ?? "—" },
    { icon: Ruler, label: "Luas Area", value: project.area_size ? `${formatNumber(project.area_size)} m²` : "—" },
    { icon: CalendarDays, label: "Periode", value: `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` },
    ...(showFinance
      ? [{ icon: Banknote, label: "Nilai Kontrak", value: formatCurrency(project.contract_value) }]
      : []),
  ];

  const sectionHeader = (title: string, action?: React.ReactNode) => (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );

  const content: Record<string, React.ReactNode> = {
    overview: (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deskripsi Proyek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.description ?? "Tidak ada deskripsi."}
            </p>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Progress Keseluruhan</span>
                <span className="font-semibold text-primary">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-3" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Informasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meta.map((m) => (
              <div key={m.label} className="flex items-start gap-3">
                <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-medium">{m.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activities.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>
    ),
    kajian: (
      <div>
        {sectionHeader(
          "Kajian Teknis",
          canEdit && <DocumentUploadDialog projectId={id} category="kajian_teknis" />
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          Mendukung PDF, DOCX, XLSX dengan version control & riwayat unduhan.
        </p>
        <DocumentTable documents={kajian} projectId={id} canDelete={canDeleteDoc} />
      </div>
    ),
    simbg: (
      <div>
        {sectionHeader(
          "SIMBG Drawing",
          canEdit && (
            <DocumentUploadDialog
              projectId={id}
              category="simbg"
              subcategories={SIMBG_SUBCATEGORIES}
              label="Upload Gambar"
            />
          )
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          Kategori: Arsitektur, Struktur, MEP, Siteplan — DWG, PDF, JPG, PNG.
        </p>
        <DocumentTable documents={simbg} showSubcategory projectId={id} canDelete={canDeleteDoc} />
      </div>
    ),
    survey: (
      <div>
        {sectionHeader(
          "Survey",
          canEdit && <DocumentUploadDialog projectId={id} category="survey" />
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          Berita acara, checklist survey, koordinat, form survey & dokumen lapangan.
        </p>
        <DocumentTable documents={survey} projectId={id} canDelete={canDeleteDoc} />
      </div>
    ),
    drone: (
      <div>
        {sectionHeader(
          "Drone Mapping",
          canEdit && (
            <DocumentUploadDialog
              projectId={id}
              category="drone"
              subcategories={DRONE_SUBCATEGORIES}
              label="Upload Data"
            />
          )
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          Orthomosaic, DSM, DTM, Point Cloud & foto udara dengan metadata.
        </p>
        {drone.length > 0 && (
          <DocumentTable documents={drone} showSubcategory projectId={id} canDelete={canDeleteDoc} />
        )}
        <div className="mt-6">
          <ProjectImageGallery images={droneImages} projectId={id} canDelete={canDeleteDoc} />
        </div>
      </div>
    ),
    images: (
      <div>
        {sectionHeader("Capture Images", canEdit && <ImageUploadDialog projectId={id} />)}
        <p className="mb-4 text-sm text-muted-foreground">
          Galeri foto: Existing Condition, Survey, Progress, Final Documentation.
        </p>
        <ProjectImageGallery images={images} projectId={id} canDelete={canDeleteDoc} />
      </div>
    ),
    area: (
      <div>
        {sectionHeader(
          "Data Luasan",
          canEdit && <AreaDataDialog projectId={id} data={area} />
        )}
        <AreaDataSection data={area} />
      </div>
    ),
    progress: (
      <div>
        {sectionHeader(
          "Progress Report",
          can(profile.role, "progress:update") && <AddProgressDialog projectId={id} />
        )}
        <ProgressSection reports={progress} currentProgress={project.progress} />
      </div>
    ),
    timeline: (
      <Card>
        <CardHeader>
          <CardTitle>Timeline Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    ),
    approval: (
      <div>
        {sectionHeader("Approval System")}
        <ApprovalSection
          approvals={approvals}
          projectId={id}
          canRespond={isClient(profile.role)}
        />
      </div>
    ),
    discussion: (
      <div>
        {sectionHeader("Discussion")}
        <DiscussionThread
          comments={comments}
          projectId={id}
          canComment={can(profile.role, "comment:create")}
        />
      </div>
    ),
  };

  if (showFinance) {
    content.invoice = (
      <div>
        {sectionHeader(
          "Invoice",
          can(profile.role, "invoice:manage") && <AddInvoiceDialog projectId={id} />
        )}
        <InvoiceTable invoices={invoices} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar proyek
        </Link>
        <div className="flex items-center gap-2">
          {canEditProject && <EditProjectDialog project={project} clients={clients} />}
          {can(profile.role, "project:delete") && <DeleteProjectButton projectId={id} />}
        </div>
      </div>

      {/* Project header */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {project.code}
            </span>
            <ProjectStatusBadge status={project.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.project_type} · {project.client?.name}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2.5" />
        </div>
      </div>

      <ProjectTabs tabs={tabs} content={content} defaultTab={tab ?? "overview"} />
    </div>
  );
}
