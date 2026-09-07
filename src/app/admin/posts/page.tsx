import { PostTable } from "@/components/admin/PostTable";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AdminPostsPage() {
  const posts = readStore().posts;
  return <PostTable posts={posts} />;
}
