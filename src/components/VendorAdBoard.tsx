import type { AdVendor } from "@/lib/types";
import { telHref } from "@/lib/vendor";
import { vendorCardIntro, vendorCardPhoto } from "@/lib/vendor-ads";

function cardHref(vendor: AdVendor) {
  if (vendor.website) return vendor.website;
  if (vendor.kakao) return vendor.kakao;
  if (vendor.phone) return telHref(vendor.phone);
  return "";
}

function VacantIcon() {
  return (
    <span className="vendor-ad-photo-empty is-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <rect x="7" y="18" width="34" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M16 18v-4a8 8 0 0116 0v4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="29" r="3.2" fill="currentColor" />
      </svg>
    </span>
  );
}

function Photo({ photo, badge }: { photo?: string; badge?: string }) {
  return (
    <div className="vendor-ad-photo">
      {photo ? <img src={photo} alt="" /> : <VacantIcon />}
      {badge ? <em>{badge}</em> : null}
    </div>
  );
}

function DetailCard({
  vendor,
  keyword,
  photo,
}: {
  vendor: AdVendor;
  keyword: string;
  photo: string;
}) {
  return (
    <article className="vendor-ad-card">
      <div className="vendor-ad-main">
        <Photo photo={photo} badge="제휴" />
        <div className="vendor-ad-copy">
          <strong>{vendor.name}</strong>
          <p className="vendor-ad-intro">{vendorCardIntro(vendor, keyword)}</p>
        </div>
      </div>
      <div className="vendor-ad-meta">
        {vendor.phone ? (
          <a className="vendor-btn is-phone" href={telHref(vendor.phone)}>
            전화
          </a>
        ) : null}
        {vendor.website ? (
          <a className="vendor-btn is-website" href={vendor.website} target="_blank" rel="noopener noreferrer">
            홈페이지
          </a>
        ) : null}
        {vendor.kakao ? (
          <a className="vendor-btn is-kakao" href={vendor.kakao} target="_blank" rel="noopener noreferrer">
            카카오톡
          </a>
        ) : null}
      </div>
    </article>
  );
}

function VacantDetail({ registerUrl }: { registerUrl?: string }) {
  const inner = (
    <>
      <div className="vendor-ad-main">
        <Photo badge="모집" />
        <div className="vendor-ad-copy">
          <strong>제휴업체모집중</strong>
          <p className="vendor-ad-intro">이 자리에 입점할 수 있습니다. 등록안내에서 신청해 주세요.</p>
        </div>
      </div>
      {registerUrl ? (
        <div className="vendor-ad-meta">
          <span className="vendor-btn">입점 가능</span>
        </div>
      ) : null}
    </>
  );
  if (registerUrl) {
    return (
      <a className="vendor-ad-card is-vacant" href={registerUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <article className="vendor-ad-card is-vacant">{inner}</article>;
}

function TileCard({ vendor, photo }: { vendor: AdVendor; photo: string }) {
  const href = cardHref(vendor);
  const media = (
    <>
      <Photo photo={photo} />
      <strong>{vendor.name}</strong>
    </>
  );
  if (!href) {
    return <article className="vendor-ad-card">{media}</article>;
  }
  const external = href.startsWith("http");
  return (
    <a
      className="vendor-ad-card"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {media}
    </a>
  );
}

function VacantTile({ registerUrl }: { registerUrl?: string }) {
  const media = (
    <>
      <Photo />
      <strong>제휴업체모집중</strong>
    </>
  );
  if (registerUrl) {
    return (
      <a className="vendor-ad-card is-vacant" href={registerUrl} target="_blank" rel="noopener noreferrer">
        {media}
      </a>
    );
  }
  return <article className="vendor-ad-card is-vacant">{media}</article>;
}

function BoardHead({ registerUrl }: { registerUrl?: string }) {
  const register = (registerUrl || "").trim();
  return (
    <div className="vendor-ad-head">
      <p>알아보면 좋을만한 업체를 안내합니다.</p>
      {register ? (
        <a className="vendor-ad-register" href={register} target="_blank" rel="noopener noreferrer">
          등록안내
        </a>
      ) : null}
    </div>
  );
}

export function VendorAdBoard({
  keyword,
  vendors,
  registerUrl,
  preview,
  layout = "cards",
  showRecruit,
}: {
  keyword: string;
  vendors: AdVendor[];
  registerUrl?: string;
  preview?: boolean;
  layout?: "cards" | "grid";
  showRecruit?: boolean;
}) {
  if (!vendors.length && !showRecruit) return null;
  const size = vendors.length + (showRecruit ? 1 : 0);
  const register = (registerUrl || "").trim();
  const vacant =
    layout === "grid" ? (
      <VacantTile key="recruit" registerUrl={register} />
    ) : (
      <VacantDetail key="recruit" registerUrl={register} />
    );
  return (
    <section
      className={`vendor-ad-board is-${layout}${preview ? " is-preview" : ""}`}
      data-slots={size}
      aria-label={`${keyword} 관련 업체`}
    >
      {preview ? <p className="vendor-ad-preview-label">입점시 이렇게 노출됩니다</p> : null}
      <BoardHead registerUrl={register} />
      <div className="vendor-ad-list">
        {vendors.map((vendor) =>
          layout === "grid" ? (
            <TileCard key={vendor.id} vendor={vendor} photo={vendorCardPhoto(vendor)} />
          ) : (
            <DetailCard
              key={vendor.id}
              vendor={vendor}
              keyword={keyword}
              photo={vendorCardPhoto(vendor)}
            />
          )
        )}
        {showRecruit ? vacant : null}
      </div>
    </section>
  );
}
