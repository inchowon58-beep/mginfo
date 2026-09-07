import { BottomNav, Footer, Header } from "@/components/Header";
import { getPartners } from "@/lib/db";
import { SITE } from "@/lib/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "제휴 업체",
};

export default function PartnersPage() {
  const partners = getPartners();
  return (
    <div className="magazine-root editorial">
      <Header active="partners" />
      <section className="edit-hero is-page">
        <p className="edit-kicker">Partners</p>
        <h1>함께하는 브랜드</h1>
        <p className="edit-dek">{SITE.name}이 신뢰하고 소개하는 현장의 파트너입니다.</p>
      </section>
      <main className="container">
        <div className="partner-grid">
          {partners.map((p) => (
            <article className="partner-card" key={p.id}>
              <div className="partner-card-image" data-cat={p.category}>
                {p.name}
              </div>
              <div className="partner-card-body">
                <div className="partner-card-meta" data-cat={p.category}>
                  <span className="partner-cat-dot" />
                  {p.category}
                </div>
                <h3>{p.name}</h3>
                <p className="partner-card-intro">{p.intro}</p>
                <div className="partner-card-actions">
                  {p.url && (
                    <a className="is-primary" href={p.url} target="_blank" rel="noreferrer">
                      사이트
                    </a>
                  )}
                  {p.phone && <span>{p.phone}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
