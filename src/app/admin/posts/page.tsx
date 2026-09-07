import { PersistNotice } from "@/components/admin/PersistNotice";
import { PostTable } from "@/components/admin/PostTable";
import { listAdminPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const category = (sp.cat || "").trim();
  const data = await listAdminPosts({ page, category });
  return (
    <>
      <PersistNotice />
      <PostTable
        key={category || "all"}
        posts={data.posts}
        categories={data.categories}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        category={category}
        allCount={data.allCount}
        counts={data.counts}
      />
    </>
  );
}
