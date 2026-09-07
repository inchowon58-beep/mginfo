import { notFound } from "next/navigation";
import { PersistNotice } from "@/components/admin/PersistNotice";
import { PostEditor } from "@/components/admin/PostEditor";
import { getPostById } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  return (
    <>
      <PersistNotice />
      <PostEditor post={post} />
    </>
  );
}
