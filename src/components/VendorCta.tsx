import type { AdVendor, Post } from "@/lib/types";
import type { VendorKind, VendorLink } from "@/lib/vendor";
import { VendorAdBoard } from "@/components/VendorAdBoard";
import {
  hasAnyVendorSticky,
  stickyVendorLinks,
  vendorContactFields,
  vendorLinks,
} from "@/lib/vendor";

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
  if (kind === "place") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2.5c-3.6 0-6.5 2.8-6.5 6.3 0 4.7 6.5 12.7 6.5 12.7s6.5-8 6.5-12.7c0-3.5-2.9-6.3-6.5-6.3zm0 8.6a2.3 2.3 0 110-4.6 2.3 2.3 0 010 4.6z"
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

function VendorStickyBar({
  items,
}: {
  items: { name: string; links: VendorLink[] }[];
}) {
  const item = items[0];
  if (!item) return null;
  const name = item.name.trim() || "이 글에서 소개한 곳";

  return (
    <div className="vendor-cta-bar" aria-label={`${name} 바로가기`}>
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
          <strong>{`"${name}"`}</strong>
        </p>
      </div>
      <Buttons links={item.links} className="vendor-cta-actions" />
    </div>
  );
}

export function VendorCta({
  post,
  vendors = [],
  registerUrl,
  showRecruit,
}: {
  post: Post;
  vendors?: AdVendor[];
  registerUrl?: string;
  showRecruit?: boolean;
}) {
  const cards = vendors.length
    ? vendors.map((vendor) => {
        const fields = vendorContactFields(vendor, post);
        return {
          id: vendor.id,
          name: vendor.name,
          region: post.region?.trim(),
          intro: (vendor.intro || "").trim(),
          links: vendorLinks(fields),
        };
      })
    : vendorLinks(post).length || post.vendorName
      ? [
          {
            id: "post",
            name: post.vendorName?.trim() || "이 글에서 소개한 곳",
            region: post.region?.trim(),
            intro: "",
            links: vendorLinks(post),
          },
        ]
      : [];

  const stickyItems = vendors.length
    ? vendors
        .map((vendor) => ({
          name: vendor.name,
          links: stickyVendorLinks(vendorContactFields(vendor, post)),
        }))
        .filter((item) => item.links.length)
    : stickyVendorLinks(post).length
      ? [{ name: post.vendorName?.trim() || "이 글에서 소개한 곳", links: stickyVendorLinks(post) }]
      : [];

  if (!vendors.length && !showRecruit && (!hasAnyVendorSticky(vendors, post) || stickyItems.length === 0)) return null;
  const displayCount = vendors.length + (showRecruit ? 1 : 0);
  const bottomLayout = displayCount <= 1 ? "cards" : "grid";

  return (
    <>
      {vendors.length || showRecruit ? (
        <VendorAdBoard
          keyword={post.title || "관련"}
          vendors={vendors}
          registerUrl={registerUrl}
          layout={bottomLayout}
          showRecruit={showRecruit}
        />
      ) : cards.length ? (
        <div className="vendor-cta-stack">
          {cards.map((card) => (
            <aside key={card.id} className="vendor-cta-card" aria-label={`${card.name} 연락`}>
              <p className="vendor-cta-kicker">Editor’s pick</p>
              <strong>{card.name}</strong>
              {card.region ? <p className="vendor-cta-region">{card.region}</p> : null}
              <p className="vendor-cta-copy">
                {card.intro || "방문 전 운영 시간과 예약 여부를 한 번 더 확인해 보세요."}
              </p>
              {card.links.length ? <Buttons links={card.links} className="vendor-cta-actions" /> : null}
            </aside>
          ))}
        </div>
      ) : null}
      {stickyItems.length ? <VendorStickyBar items={stickyItems} /> : null}
    </>
  );
}
