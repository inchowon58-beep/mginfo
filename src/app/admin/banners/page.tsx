import { PersistNotice } from "@/components/admin/PersistNotice";
import { BannerManager } from "@/components/admin/BannerManager";
import { getBanners } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const banners = await getBanners();
  return (
    <>
      <PersistNotice />
      <BannerManager banners={banners} />
    </>
  );
}
