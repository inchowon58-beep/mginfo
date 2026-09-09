function cleanHost(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

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

function apexDomain(host) {
  const parts = cleanHost(host).split(".").filter(Boolean);
  if (parts.length < 2) return cleanHost(host);
  const lastTwo = parts.slice(-2).join(".");
  if (KR_SECOND_LEVEL.has(lastTwo) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function subdomainLabel(host, apex) {
  const h = cleanHost(host);
  const a = apex || apexDomain(h);
  if (!h || h === a) return "@";
  if (h.endsWith(`.${a}`)) return h.slice(0, -(a.length + 1));
  return h;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function siteRecord(partial = {}) {
  const domain = cleanHost(partial.domain);
  const apex = cleanHost(partial.apexDomain) || (domain ? apexDomain(domain) : "");
  const now = new Date().toISOString();
  return {
    id: String(partial.id || "").trim() || uid(),
    siteName: String(partial.siteName || partial.blogName || "").trim(),
    domain,
    apexDomain: apex,
    subdomain: subdomainLabel(domain, apex),
    concept: String(partial.concept || "").trim(),
    vmName: String(partial.vmName || "").trim(),
    naverId: String(partial.naverId || "").trim(),
    naverPassword: String(partial.naverPassword || "").trim(),
    createdAt: partial.createdAt || now,
    updatedAt: now,
    projectName: String(partial.projectName || "").trim(),
    vercelHost: String(partial.vercelHost || "").trim(),
    siteUrl: String(partial.siteUrl || "").trim() || (domain ? `https://${domain}` : ""),
    adminUrl: String(partial.adminUrl || "").trim(),
  };
}

function upsertSite(list, row) {
  const next = siteRecord(row);
  const sites = Array.isArray(list) ? list.slice() : [];
  const idx = sites.findIndex((item) => item.id === next.id || (next.domain && item.domain === next.domain));
  if (idx >= 0) {
    const prev = sites[idx];
    sites[idx] = {
      ...prev,
      ...next,
      id: prev.id,
      createdAt: prev.createdAt || next.createdAt,
      updatedAt: next.updatedAt,
    };
  } else {
    sites.unshift(next);
  }
  return sites;
}

function migrateHistoryToSites(history, sites) {
  const list = Array.isArray(sites) ? sites.slice() : [];
  for (const row of Array.isArray(history) ? history : []) {
    const domain = cleanHost(row.domain);
    if (!domain) continue;
    if (list.some((item) => item.domain === domain)) continue;
    list.push(
      siteRecord({
        siteName: row.blogName || row.siteName,
        domain,
        createdAt: row.createdAt,
        projectName: row.projectName,
        vercelHost: row.vercelHost,
        siteUrl: row.siteUrl,
        adminUrl: row.adminUrl,
      })
    );
  }
  return list;
}

function groupByApex(list) {
  const map = new Map();
  for (const site of Array.isArray(list) ? list : []) {
    const key = site.apexDomain || apexDomain(site.domain) || "(도메인 없음)";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(site);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ko"))
    .map(([apex, sites]) => ({
      apex,
      count: sites.length,
      sites: sites.slice().sort((a, b) => a.domain.localeCompare(b.domain, "ko")),
    }));
}

function filterSites(list, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return Array.isArray(list) ? list : [];
  return (list || []).filter((site) =>
    [site.siteName, site.domain, site.apexDomain, site.concept, site.vmName, site.naverId]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

module.exports = {
  apexDomain,
  cleanHost,
  filterSites,
  groupByApex,
  migrateHistoryToSites,
  siteRecord,
  subdomainLabel,
  upsertSite,
};
