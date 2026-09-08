import { PersistNotice } from "@/components/admin/PersistNotice";
import { AdVendorManager } from "@/components/admin/AdVendorManager";
import { getAdVendors } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const vendors = await getAdVendors();
  return (
    <>
      <PersistNotice />
      <AdVendorManager vendors={vendors} />
    </>
  );
}
