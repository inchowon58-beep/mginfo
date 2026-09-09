import { AdminShell } from "./AdminShell";
import { isOpsHub } from "@/lib/ops-hub";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell showOps={await isOpsHub()}>{children}</AdminShell>;
}
