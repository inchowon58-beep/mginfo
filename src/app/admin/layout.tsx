import { AdminShell } from "./AdminShell";
import { isOpsHub } from "@/lib/ops-hub";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell showOps={isOpsHub()}>{children}</AdminShell>;
}
