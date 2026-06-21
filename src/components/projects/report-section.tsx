import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentUploadDialog } from "@/components/projects/document-upload-dialog";
import { DocumentActions } from "@/components/projects/document-actions";
import { kindFromType } from "@/lib/file-kind";
import { formatDate } from "@/lib/utils";
import type { ProjectDocument } from "@/types/database";

/**
 * Simplified report bucket used by report-only clients (e.g. VALE-RIVANO):
 * upload gambar & PDF into one report (Harian / Mingguan / Bulanan) and view
 * them as a grid — image thumbnails inline, PDFs as cards.
 */
export function ReportSection({
  projectId,
  title,
  subcategory,
  documents,
  canEdit,
  canDelete,
}: {
  projectId: string;
  title: string;
  subcategory: string;
  documents: ProjectDocument[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Unggah gambar & PDF untuk {title.toLowerCase()}.
          </p>
        </div>
        {canEdit && (
          <DocumentUploadDialog
            projectId={projectId}
            category="other"
            fixedSubcategory={subcategory}
            label="Upload Gambar / PDF"
          />
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada laporan"
          description="Gambar & PDF yang diunggah akan tampil di sini."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => {
            const isImage = kindFromType(doc.file_type) === "image";
            return (
              <figure
                key={doc.id}
                className="group relative overflow-hidden rounded-xl border bg-card"
              >
                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted">
                  {isImage && doc.file_url ? (
                    <img
                      src={doc.file_url}
                      alt={doc.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <figcaption className="space-y-1.5 p-3">
                  <p className="truncate text-sm font-medium" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </p>
                  <div className="border-t pt-1">
                    <DocumentActions
                      documentId={doc.id}
                      projectId={projectId}
                      name={doc.name}
                      filePath={doc.file_path}
                      fileType={doc.file_type}
                      canDelete={canDelete}
                    />
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
