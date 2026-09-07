import Link from "next/link";
import type { Partner } from "@/lib/types";

export function PartnerStrip({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;
  return (
    <section className="partner-banner">
      <div className="container">
        <h2>Partners</h2>
        <div className="partner-strip">
          {partners.map((p) => (
            <Link
              key={p.id}
              className="partner-chip"
              href={p.url || "/partners"}
              target={p.url ? "_blank" : undefined}
            >
              <div className="partner-chip-image" />
              <div className="partner-chip-name">{p.name}</div>
              <div className="partner-chip-sub">{p.category}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
