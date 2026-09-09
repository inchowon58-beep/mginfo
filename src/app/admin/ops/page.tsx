import { isMasterSession } from "@/lib/auth";
import { OpsLedger, OpsUnlock } from "@/components/admin/OpsLedger";
import { getOpsSites } from "@/lib/ops-store";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  if (!(await isMasterSession())) return <OpsUnlock />;
  const sites = await getOpsSites();
  return <OpsLedger sites={sites} />;
}
