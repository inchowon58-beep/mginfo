import type { VendorKind, VendorLink } from "@/lib/vendor";
import { hasVendorCta, vendorLinks } from "@/lib/vendor";
import type { Post } from "@/lib/types";

function Icon({ kind }: { kind: VendorKind }) {
  if (kind === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        />
      </svg>
    );
  }
  if (kind === "kakao") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 4C6.5 4 2 7.6 2 12c0 2.8 1.8 5.3 4.6 6.8L5.8 22l4.1-2.2c.7.1 1.4.2 2.1.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2c.5 1.5 1.2 3.6 1.4 6H10.6C10.8 8.6 11.5 6.5 12 5zm-3.9.7C7 7.4 6.4 9.6 6.2 11h3.2C9.6 8.4 8.8 6.6 8.1 5.7zM15.9 5.7c-.7.9-1.5 2.7-1.7 5.3h3.2c-.2-1.4-.8-3.6-1.5-5.3zM6.2 13c.2 1.4.8 3.6 1.9 5.3.7-.9 1.5-2.7 1.7-5.3H6.2zm5.8 6c-.5-1.5-1.2-3.6-1.4-6h3.8c-.2 2.4-.9 4.5-1.4 6zm3.9-.7c1.1-1.7 1.7-3.9 1.9-5.3h-3.2c.2 2.6 1 4.4 1.3 5.3z"
      />
    </svg>
  );
}

function Buttons({ links, className }: { links: VendorLink[]; className: string }) {
  return (
    <div className={className}>
      {links.map((link) => (
        <a
          key={link.kind}
          className={`vendor-btn is-${link.kind}`}
          href={link.href}
          target={link.kind === "phone" ? undefined : "_blank"}
          rel={link.kind === "phone" ? undefined : "noopener noreferrer"}
        >
          <Icon kind={link.kind} />
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}

export function VendorCta({ post }: { post: Post }) {
  const links = vendorLinks(post);
  if (!hasVendorCta(post) || links.length === 0) return null;
  const name = post.vendorName?.trim();
  const region = post.region?.trim();

  return (
    <>
      <aside className="vendor-cta-card" aria-label="업체 연락">
        <p className="vendor-cta-kicker">Editor’s pick</p>
        <strong>{name || "이 글에서 소개한 곳"}</strong>
        {region ? <p className="vendor-cta-region">{region}</p> : null}
        <p className="vendor-cta-copy">방문 전 운영 시간과 예약 여부를 한 번 더 확인해 보세요.</p>
        <Buttons links={links} className="vendor-cta-actions" />
      </aside>
      <div className="vendor-cta-bar" aria-label={name ? `${name} 바로가기` : "업체 바로가기"}>
        <div className="vendor-cta-bar-pick">
          <span className="vendor-cta-bar-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2.4l7.6 3.2v6.6c0 4.8-3.2 9.2-7.6 10.6C7.6 21.4 4.4 17 4.4 12.2V5.6L12 2.4zm-1.15 13.15 5.4-5.4-1.4-1.4-4 4-1.85-1.85-1.4 1.4 3.25 3.25z"
              />
            </svg>
          </span>
          <p>
            <em>알아보면 좋은 업체</em>
            <strong>{`"${name || "이 글에서 소개한 곳"}"`}</strong>
          </p>
        </div>
        <Buttons links={links} className="vendor-cta-actions" />
      </div>
    </>
  );
}
