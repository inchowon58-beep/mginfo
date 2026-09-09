import Link from "next/link";
import { PartnerMedia } from "@/components/PartnerMedia";
import type { Partner } from "@/lib/types";

export function PartnerStrip({
  partners,
  title = "Partners",
}: {
  partners: Partner[];
  title?: string;
}) {
  if (!partners.length) return null;
  return (
    <section className="partner-banner">
      <div className="container">
        <h2>{title}</h2>
        <div className="partner-strip">
          {partners.map((p) => (
            <Link
              key={p.id}
              className="partner-chip"
              href={p.url || "/partners"}
              target={p.url ? "_blank" : undefined}
              rel={p.url ? "noopener noreferrer" : undefined}
            >
              <PartnerMedia partner={p} variant="chip" />
              <div className="partner-chip-name">{p.name}</div>
              <div className="partner-chip-sub">{p.category}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
