import { BannerManager } from "@/components/admin/BannerManager";
import { getBanners } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminBannersPage() {
  const banners = getBanners();
  return <BannerManager banners={banners} />;
}
