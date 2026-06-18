import { notFound } from "next/navigation";
import { getProjectBundleByShareToken } from "@/lib/portal";
import { PortalProjectView } from "@/components/portal/portal-project-view";

export default async function PortalSingleProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getProjectBundleByShareToken(token);
  if (!bundle) notFound();

  return <PortalProjectView bundle={bundle} />;
}
