export type OpsSite = {
  id: string;
  siteName: string;
  domain: string;
  apexDomain: string;
  subdomain: string;
  concept: string;
  vmName: string;
  naverId: string;
  naverPassword: string;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  vercelHost?: string;
  siteUrl?: string;
  adminUrl?: string;
};

const KR_SECOND_LEVEL = new Set([
  "co.kr",
  "or.kr",
  "ne.kr",
  "go.kr",
  "ac.kr",
  "re.kr",
  "pe.kr",
  "hs.kr",
  "ms.kr",
  "es.kr",
  "sc.kr",
  "kg.kr",
]);

export function cleanHost(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function apexDomain(host: string) {
  const parts = cleanHost(host).split(".").filter(Boolean);
  if (parts.length < 2) return cleanHost(host);
  const lastTwo = parts.slice(-2).join(".");
  if (KR_SECOND_LEVEL.has(lastTwo) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

export function subdomainLabel(host: string, apex?: string) {
  const h = cleanHost(host);
  const a = apex || apexDomain(h);
  if (!h || h === a) return "@";
  if (h.endsWith(`.${a}`)) return h.slice(0, -(a.length + 1));
  return h;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseOpsSite(raw: unknown, current?: OpsSite): OpsSite | null {
  if (!raw || typeof raw !== "object") return current || null;
  const row = raw as Record<string, unknown>;
  const domain = cleanHost(String(row.domain ?? current?.domain ?? ""));
  if (!domain) return null;
  const apex = cleanHost(String(row.apexDomain ?? current?.apexDomain ?? "")) || apexDomain(domain);
  const now = new Date().toISOString();
  return {
    id: String(row.id ?? current?.id ?? "").trim() || uid(),
    siteName: String(row.siteName ?? row.blogName ?? current?.siteName ?? "").trim(),
    domain,
    apexDomain: apex,
    subdomain: subdomainLabel(domain, apex),
    concept: String(row.concept ?? current?.concept ?? "").trim(),
    vmName: String(row.vmName ?? current?.vmName ?? "").trim(),
    naverId: String(row.naverId ?? current?.naverId ?? "").trim(),
    naverPassword: String(row.naverPassword ?? current?.naverPassword ?? "").trim(),
    createdAt: String(row.createdAt ?? current?.createdAt ?? now),
    updatedAt: String(row.updatedAt ?? now),
    projectName: String(row.projectName ?? current?.projectName ?? "").trim(),
    vercelHost: String(row.vercelHost ?? current?.vercelHost ?? "").trim(),
    siteUrl: String(row.siteUrl ?? current?.siteUrl ?? "").trim() || `https://${domain}`,
    adminUrl: String(row.adminUrl ?? current?.adminUrl ?? "").trim(),
  };
}

export function parseOpsSites(raw: unknown): OpsSite[] {
  if (!Array.isArray(raw)) return [];
  const out: OpsSite[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const site = parseOpsSite(item);
    if (!site || seen.has(site.domain)) continue;
    seen.add(site.domain);
    out.push(site);
  }
  return out;
}

export function groupOpsSites(list: OpsSite[]) {
  const map = new Map<string, OpsSite[]>();
  for (const site of list) {
    const key = site.apexDomain || apexDomain(site.domain) || "(도메인 없음)";
    const rows = map.get(key) || [];
    rows.push(site);
    map.set(key, rows);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ko"))
    .map(([apex, sites]) => ({
      apex,
      count: sites.length,
      sites: sites.slice().sort((a, b) => a.domain.localeCompare(b.domain, "ko")),
    }));
}
