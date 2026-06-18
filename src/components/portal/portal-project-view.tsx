import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  type PreviewItem,
} from "@/components/portal/file-preview-grid";
import { PortalFolder } from "@/components/portal/portal-folder";
import { kindFromType } from "@/lib/file-kind";
import type { PortalProjectBundle } from "@/lib/portal";
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

/**
 * Read-only project detail shown in both the client portal
 * (/portal/<token>/p/<id>) and the per-project portal (/portal/proyek/<token>).
 * Pass `backHref` to show a "back to projects" link (client portal only).
 */
export function PortalProjectView({
  bundle,
  backHref,
}: {
  bundle: PortalProjectBundle;
  backHref?: string;
}) {
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
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar proyek
        </Link>
      )}

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

      <p className="text-sm text-muted-foreground">Ketuk folder untuk membuka isinya.</p>

      <div className="space-y-3">
        <PortalFolder title="Laporan Progress" count={progress.length} unit="laporan">
          <ProgressSection reports={progress} currentProgress={project.progress} />
        </PortalFolder>

        <PortalFolder title="Kajian Teknis" count={kajian.length} unit="dokumen">
          <FilePreviewGrid items={docsToItems(kajian)} emptyLabel="Belum ada dokumen kajian teknis." />
        </PortalFolder>

        <PortalFolder title="Gambar SIMBG" count={simbg.length} unit="gambar">
          <FilePreviewGrid items={docsToItems(simbg)} emptyLabel="Belum ada gambar SIMBG." />
        </PortalFolder>

        <PortalFolder title="Survey" count={survey.length} unit="dokumen">
          <FilePreviewGrid items={docsToItems(survey)} emptyLabel="Belum ada dokumen survey." />
        </PortalFolder>

        {drone.length > 0 && (
          <PortalFolder title="Drone Mapping" count={drone.length} unit="file">
            <FilePreviewGrid items={docsToItems(drone)} />
          </PortalFolder>
        )}

        <PortalFolder title="Capture Image" count={images.length} unit="foto">
          <FilePreviewGrid items={imageItems} emptyLabel="Belum ada foto dokumentasi." />
        </PortalFolder>

        <PortalFolder title="Data Luasan">
          <AreaDataSection data={area} />
        </PortalFolder>

        <PortalFolder title="Invoice" count={invoices.length} unit="invoice">
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
        </PortalFolder>
      </div>
    </div>
  );
}
