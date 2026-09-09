import type { Partner } from "@/lib/types";

export function PartnerMedia({
  partner,
  variant = "chip",
}: {
  partner: Partner;
  variant?: "chip" | "card" | "avatar";
}) {
  const className =
    variant === "card" ? "partner-card-image" : variant === "avatar" ? "partner-avatar" : "partner-chip-image";
  if (partner.imageUrl) {
    return (
      <span className={`${className} has-photo`}>
        <img src={partner.imageUrl} alt="" />
      </span>
    );
  }
  if (variant === "card") {
    return (
      <div className={className} data-cat={partner.category}>
        {partner.name}
      </div>
    );
  }
  if (variant === "avatar") {
    return <span className={className}>{partner.name.slice(0, 1)}</span>;
  }
  return <div className={className} />;
}
