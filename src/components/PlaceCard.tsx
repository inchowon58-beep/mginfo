import type { Post, PostImage } from "@/lib/types";

function placePhotos(post: Post): PostImage[] {
  const items: PostImage[] = [];
  const seen = new Set<string>();
  const push = (url?: string, caption?: string) => {
    const href = (url || "").trim();
    if (!href || seen.has(href)) return;
    seen.add(href);
    items.push(caption ? { url: href, caption } : { url: href });
  };
  push(post.coverImage, post.coverCaption);
  for (const image of post.extraImages || []) push(image.url, image.caption);
  return items;
}

function placeBrief(post: Post): string {
  const excerpt = (post.excerpt || "").trim();
  if (excerpt) return excerpt;
  const text = (post.bodyHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export function PlaceCard({ post }: { post: Post }) {
  const href = post.vendorPlaceUrl?.trim();
  if (!href) return null;
  const photos = placePhotos(post);
  const brief = placeBrief(post);
  const name = post.vendorName?.trim();

  return (
    <section className="place-card" aria-label="네이버 플레이스">
      <p className="place-card-kicker">네이버 플레이스</p>
      <strong>{name || "이 글에서 소개한 곳"}</strong>
      {brief ? <p className="place-card-copy">{brief}</p> : null}
      {photos.length > 0 ? (
        <div className={`place-card-photos${photos.length === 1 ? " is-single" : ""}`}>
          {photos.map((image, index) => (
            <figure key={`${image.url}-${index}`}>
              <img src={image.url} alt={image.caption || `${name || "소개 업체"} 사진 ${index + 1}`} />
            </figure>
          ))}
        </div>
      ) : null}
      <a className="place-card-btn" href={href} target="_blank" rel="noopener noreferrer">
        네이버 플레이스 바로가기
      </a>
    </section>
  );
}
