import { AdminShell } from "./AdminShell";
import { isOpsHub } from "@/lib/ops-hub";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell showOps={await isOpsHub()}>{children}</AdminShell>;
}
