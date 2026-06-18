import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { AI_ENABLED } from "@/lib/config";
import { getAllDocuments } from "@/lib/queries";
import { PageHeader } from "@/components/shared/page-header";
import { AssistantChat, type DocOption } from "@/components/assistant/assistant-chat";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "AI Assistant" };

const ANALYZABLE = ["pdf", "jpg", "jpeg", "png", "webp"];

export default async function AssistantPage() {
  await requireProfile();

  const docs = await getAllDocuments();
  const documents: DocOption[] = docs
    .filter((d) => ANALYZABLE.includes((d.file_type ?? "").toLowerCase()))
    .map((d) => ({ id: d.id, name: d.name, projectName: d.project_name }));

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="Ringkasan progres, analisa dokumen (PDF/gambar), pencarian bahasa natural, dan generate laporan."
      >
        <Badge variant={AI_ENABLED ? "default" : "secondary"}>
          {AI_ENABLED ? "Live (Claude)" : "Mode Demo"}
        </Badge>
      </PageHeader>
      <AssistantChat aiEnabled={AI_ENABLED} documents={documents} />
    </div>
  );
}
