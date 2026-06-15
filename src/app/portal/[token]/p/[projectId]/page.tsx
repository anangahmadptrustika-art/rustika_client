import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  FileBox,
  FileText,
  MapPinned,
  Plane,
  Receipt,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { getClientByToken, getPortalProjectBundle } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectStatusBadge, InvoiceStatusBadge } from "@/components/shared/status-badge";
import { ProgressSection } from "@/components/projects/progress-section";
import { AreaDataSection } from "@/components/projects/area-data-section";
import {
  FilePreviewGrid,
  kindFromType,
  type PreviewItem,
} from "@/components/portal/file-preview-grid";
import type { ProjectDocument } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";

function docsToItems(docs: ProjectDocument[]): PreviewItem[] {
  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    url: d.file_url,
    kind: kindFromType(d.file_type),
    size: d.file_size,
    badge: d.subcategory,
    version: d.version,
  }));
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ token: string; projectId: string }>;
}) {
  const { token, projectId } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  const bundle = await getPortalProjectBundle(client.id, projectId);
  if (!bundle) notFound();

  const { project, documents, images, progress, area, invoices } = bundle;

  const kajian = documents.filter((d) => d.category === "kajian_teknis");
  const simbg = documents.filter((d) => d.category === "simbg");
  const survey = documents.filter((d) => d.category === "survey");
  const drone = documents.filter((d) => d.category === "drone");

  const imageItems: PreviewItem[] = images.map((i) => ({
    id: i.id,
    name: i.title ?? "Foto",
    url: i.file_url,
    kind: "image",
    size: i.file_size,
  }));

  return (
    <div className="space-y-8">
      <Link
        href={`/portal/${token}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar proyek
      </Link>

      {/* Header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{project.code}</span>
          <ProjectStatusBadge status={project.status} />
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.project_type} · {project.location}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progres Keseluruhan</span>
            <span className="font-bold">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2.5" />
        </div>
      </div>

      <Section icon={TrendingUp} title="Laporan Progress">
        <ProgressSection reports={progress} currentProgress={project.progress} />
      </Section>

      <Section icon={FileText} title="Kajian Teknis">
        <FilePreviewGrid items={docsToItems(kajian)} emptyLabel="Belum ada dokumen kajian teknis." />
      </Section>

      <Section icon={FileBox} title="Gambar SIMBG">
        <FilePreviewGrid items={docsToItems(simbg)} emptyLabel="Belum ada gambar SIMBG." />
      </Section>

      <Section icon={MapPinned} title="Survey">
        <FilePreviewGrid items={docsToItems(survey)} emptyLabel="Belum ada dokumen survey." />
      </Section>

      {drone.length > 0 && (
        <Section icon={Plane} title="Drone Mapping">
          <FilePreviewGrid items={docsToItems(drone)} />
        </Section>
      )}

      <Section icon={Camera} title="Capture Image">
        <FilePreviewGrid items={imageItems} emptyLabel="Belum ada foto dokumentasi." />
      </Section>

      <Section icon={Ruler} title="Data Luasan">
        <AreaDataSection data={area} />
      </Section>

      <Section icon={Receipt} title="Invoice">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Belum ada invoice.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.termin ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(inv.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.due_date)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}
