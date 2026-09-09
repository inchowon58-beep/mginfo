import { isMasterSession } from "@/lib/auth";
import { OpsLedger, OpsUnlock } from "@/components/admin/OpsLedger";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  if (!isOpsHub()) notFound();
  if (!(await isMasterSession())) return <OpsUnlock />;
  const sites = await getOpsSites();
  return <OpsLedger sites={sites} />;
}
