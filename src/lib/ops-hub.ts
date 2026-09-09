export function isOpsHub() {
  const flag = String(process.env.OPS_LEDGER || "").trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  const domain = String(process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  if (domain === "magazine.infocs.co.kr") return true;
  return !process.env.VERCEL && !domain;
}
