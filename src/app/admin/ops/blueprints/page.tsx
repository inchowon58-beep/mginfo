import { isMasterSession } from "@/lib/auth";
import { ContentBlueprintsAdmin } from "@/components/admin/ContentBlueprintsAdmin";
import { OpsUnlock } from "@/components/admin/OpsLedger";
import { isOpsHub } from "@/lib/ops-hub";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminContentBlueprintsPage() {
  if (!(await isOpsHub())) notFound();
  if (!(await isMasterSession())) return <OpsUnlock />;
  return <ContentBlueprintsAdmin />;
}
