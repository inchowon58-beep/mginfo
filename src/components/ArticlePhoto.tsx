import type { PostImage } from "@/lib/types";

export function ArticlePhoto({
  image,
  alt,
  className = "article-photo",
}: {
  image: PostImage;
  alt: string;
  className?: string;
}) {
  if (!image.url) return null;
  return (
    <figure className={className}>
      <img src={image.url} alt={image.caption || alt} />
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </figure>
  );
}

export function ArticleGallery({ images, alt }: { images: PostImage[]; alt: string }) {
  if (images.length === 0) return null;
  return (
    <section className={`article-gallery${images.length === 1 ? " is-single" : ""}`} aria-label="사진">
      {images.map((image, index) => (
        <ArticlePhoto key={`${image.url}-${index}`} image={image} alt={`${alt} ${index + 1}`} />
      ))}
    </section>
  );
}
