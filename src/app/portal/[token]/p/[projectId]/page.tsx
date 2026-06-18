import { notFound } from "next/navigation";
import { getClientByToken, getPortalProjectBundle } from "@/lib/portal";
import { PortalProjectView } from "@/components/portal/portal-project-view";

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

  return <PortalProjectView bundle={bundle} backHref={`/portal/${token}`} />;
}
