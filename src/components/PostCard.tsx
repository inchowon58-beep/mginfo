import Link from "next/link";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export function PostCard({
  post,
  featured = false,
}: {
  post: Post;
  featured?: boolean;
}) {
  const cat = getCategory(post.category);
  return (
    <Link className={`post-card ${featured ? "is-featured" : ""}`} href={`/posts/${post.slug}`}>
      <div className="post-card-thumb">
        {post.coverImage ? (
          <img src={post.coverImage} alt="" />
        ) : null}
      </div>
      <div className="post-card-body">
        <span className="post-card-cat" data-cat={cat?.name}>
          {cat?.name}
        </span>
        <h3>{post.title}</h3>
        <p className="post-card-excerpt">{post.excerpt}</p>
        <span className="post-card-meta">{formatDate(post.publishedAt)}</span>
      </div>
    </Link>
  );
}
