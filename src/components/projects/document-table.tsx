import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentDownloadButton } from "@/components/projects/document-download-button";
import { formatBytes, formatDate } from "@/lib/utils";
import type { ProjectDocument } from "@/types/database";

function iconForType(type: string | null) {
  switch ((type ?? "").toLowerCase()) {
    case "pdf":
      return FileText;
    case "xlsx":
    case "xls":
    case "csv":
      return FileSpreadsheet;
    case "jpg":
    case "jpeg":
    case "png":
      return FileImage;
    case "dwg":
    case "zip":
    case "rar":
      return FileArchive;
    default:
      return FileIcon;
  }
}

export function DocumentTable({
  documents,
  showSubcategory = false,
}: {
  documents: ProjectDocument[];
  showSubcategory?: boolean;
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Belum ada dokumen"
        description="Dokumen yang diunggah akan tampil di sini dengan version control."
      />
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Dokumen</TableHead>
            {showSubcategory && <TableHead>Kategori</TableHead>}
            <TableHead className="w-20">Versi</TableHead>
            <TableHead className="w-28">Ukuran</TableHead>
            <TableHead className="w-32">Tanggal</TableHead>
            <TableHead className="w-16 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const Icon = iconForType(doc.file_type);
            return (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doc.name}</p>
                      {doc.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                {showSubcategory && (
                  <TableCell>
                    {doc.subcategory ? (
                      <Badge variant="secondary">{doc.subcategory}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline">v{doc.version}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatBytes(doc.file_size)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(doc.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <DocumentDownloadButton filePath={doc.file_path} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
