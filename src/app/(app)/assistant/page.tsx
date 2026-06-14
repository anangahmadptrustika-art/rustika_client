import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { AI_ENABLED } from "@/lib/config";
import { PageHeader } from "@/components/shared/page-header";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await requireProfile();

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="Ringkasan progres, ringkasan PDF, pencarian dokumen bahasa natural, dan generate laporan."
      >
        <Badge variant={AI_ENABLED ? "default" : "secondary"}>
          {AI_ENABLED ? "Live (Claude)" : "Mode Demo"}
        </Badge>
      </PageHeader>
      <AssistantChat aiEnabled={AI_ENABLED} />
    </div>
  );
}
