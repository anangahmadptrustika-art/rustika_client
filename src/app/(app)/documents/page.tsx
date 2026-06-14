import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getAllDocuments } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dokumen" };

export default async function DocumentsPage() {
  await requireProfile();
  const documents = await getAllDocuments();

  return (
    <div>
      <PageHeader
        title="Dokumen"
        description="Seluruh dokumen lintas proyek — kajian teknis, SIMBG, survey, dan lainnya."
      />
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada dokumen" />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Dokumen</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="w-20">Versi</TableHead>
                <TableHead className="w-28">Ukuran</TableHead>
                <TableHead className="w-32">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/projects/${doc.project_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {doc.project_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{doc.version}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatBytes(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
