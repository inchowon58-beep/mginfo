import { PersistNotice } from "@/components/admin/PersistNotice";
import { PostTable } from "@/components/admin/PostTable";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = (await readStore()).posts;
  return (
    <>
      <PersistNotice />
      <PostTable posts={posts} />
    </>
  );
}
