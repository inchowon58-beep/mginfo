import { PersistNotice } from "@/components/admin/PersistNotice";
import { PostEditor } from "@/components/admin/PostEditor";

export default function NewPostPage() {
  return (
    <>
      <PersistNotice />
      <PostEditor />
    </>
  );
}
