import { isMasterSession } from "@/lib/auth";
import { HubBoardAds } from "@/components/admin/HubBoardAds";
import { OpsUnlock } from "@/components/admin/OpsLedger";
import { isOpsHub } from "@/lib/ops-hub";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminHubBoardPage() {
  if (!(await isOpsHub())) notFound();
  if (!(await isMasterSession())) return <OpsUnlock />;
  return <HubBoardAds />;
}
