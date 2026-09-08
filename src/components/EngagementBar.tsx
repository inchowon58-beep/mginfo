"use client";

import { countInRange, isEngageVisible } from "@/lib/engagement";
import { useEngagement } from "@/components/EngagementContext";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 8 6.8 6.4 9 6.4c1.3 0 2.4.6 3 1.6.6-1 1.7-1.6 3-1.6 2.2 0 4 1.6 4 4.4C19 15.6 12 20 12 20z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d="M20 12c0 4-3.6 7.2-8 7.2-.9 0-1.7-.1-2.5-.3L4 20l1.3-3.3C4.5 15.6 4 13.9 4 12c0-4 3.6-7.2 8-7.2s8 3.2 8 7.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function EngagementBar({
  postId,
  className = "engage-bar",
}: {
  postId: string;
  className?: string;
}) {
  const range = useEngagement();
  const showLikes = isEngageVisible(range.likeMin, range.likeMax);
  const showComments = isEngageVisible(range.commentMin, range.commentMax);
  if (!showLikes && !showComments) return null;
  const likes = countInRange(postId, 17, range.likeMin, range.likeMax);
  const comments = countInRange(postId, 91, range.commentMin, range.commentMax);
  return (
    <div className={className} aria-hidden>
      {showLikes ? (
        <span className="engage-item">
          <HeartIcon />
          {likes.toLocaleString("ko-KR")}
        </span>
      ) : null}
      {showComments ? (
        <span className="engage-item">
          <CommentIcon />
          {comments.toLocaleString("ko-KR")}
        </span>
      ) : null}
    </div>
  );
}
