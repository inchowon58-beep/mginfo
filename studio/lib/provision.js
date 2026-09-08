const crypto = require("crypto");

const API = "https://api.vercel.com";
const DEFAULT_REPO = "inchowon58-beep/mginfo";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function domainFromProjectSlug(slug) {
  let value = String(slug || "").trim().toLowerCase();
  if (!value || value.includes(".")) return value;
  const tlds = [
    ["-co-kr", ".co.kr"],
    ["-or-kr", ".or.kr"],
    ["-go-kr", ".go.kr"],
    ["-ne-kr", ".ne.kr"],
    ["-re-kr", ".re.kr"],
    ["-com", ".com"],
    ["-net", ".net"],
    ["-org", ".org"],
    ["-kr", ".kr"],
  ];
  for (const [from, to] of tlds) {
    if (value.endsWith(from)) {
      value = value.slice(0, -from.length) + to;
      break;
    }
  }
  if (!value.includes(".")) return value.replace(/-/g, ".");
  const [host, ...rest] = value.split(".");
  if (host.includes("-")) value = `${host.replace(/-/g, ".")}.${rest.join(".")}`;
  return value;
}

function cleanDomain(raw) {
  let value = String(raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[。．｡]/g, ".")
    .replace(/\s+/g, "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
  if (value && !value.includes(".")) value = domainFromProjectSlug(value);
  return value;
}

function projectNameFromDomain(domain) {
  const slug = domain
    .replace(/^www\./, "")
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "magazine-site";
}

function apiError(data, fallback) {
  return data?.error?.message || data?.message || fallback;
}

async function vercel(token, path, { method = "GET", body, teamId } = {}) {
  const url = new URL(API + path);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(apiError(data, `Vercel 요청 실패 (${res.status})`));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function waitForDeployment(token, teamId, id, onLog) {
  for (let i = 0; i < 90; i += 1) {
    const row = await vercel(token, `/v13/deployments/${id}`, { teamId });
    const state = row.readyState || row.status || "";
    if (state === "READY") return row;
    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(row.errorMessage || "배포가 실패했습니다.");
    }
    if (i === 0 || i % 3 === 0) onLog(`배포 상태: ${state || "대기"}`);
    await sleep(4000);
  }
  throw new Error("배포가 너무 오래 걸립니다. Vercel 대시보드에서 확인해 주세요.");
}

async function getProject(token, teamId, idOrName) {
  return vercel(token, `/v9/projects/${encodeURIComponent(idOrName)}`, { teamId });
}

async function latestDeployment(token, teamId, projectId) {
  const data = await vercel(token, `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=5`, { teamId });
  const rows = data.deployments || [];
  return rows[0] || null;
}

function gitSourceFrom(project, repo) {
  const link = project.link || {};
  if (link.repoId) {
    return { type: "github", ref: link.productionBranch || "main", repoId: link.repoId };
  }
  const [org, name] = String(repo).split("/");
  return {
    type: "github",
    ref: "main",
    org: org || "inchowon58-beep",
    repo: name || repo,
  };
}

function isApexDomain(domain) {
  const parts = String(domain || "").split(".").filter(Boolean);
  const last2 = parts.slice(-2).join(".");
  if (["co.kr", "or.kr", "go.kr", "ne.kr", "re.kr", "ac.kr"].includes(last2)) {
    return parts.length === 3;
  }
  return parts.length === 2;
}

function dnsHostLabel(domain) {
  if (isApexDomain(domain)) return "@";
  const parts = String(domain || "").split(".").filter(Boolean);
  const last2 = parts.slice(-2).join(".");
  if (["co.kr", "or.kr", "go.kr", "ne.kr", "re.kr", "ac.kr"].includes(last2)) {
    return parts.slice(0, -2).join(".");
  }
  return parts.slice(0, -2).join(".") || parts[0];
}

function projectDomains(data) {
  if (Array.isArray(data?.domains)) return data.domains;
  if (Array.isArray(data)) return data;
  return [];
}

async function listProjectDomains(token, teamId, projectId) {
  const data = await vercel(token, `/v9/projects/${projectId}/domains?limit=100`, { teamId });
  return projectDomains(data);
}

async function getProjectDomain(token, teamId, projectId, domain) {
  const rows = await listProjectDomains(token, teamId, projectId);
  return rows.find((row) => String(row.name || "").toLowerCase() === domain) || null;
}

function conflictProjectId(err) {
  const data = err?.data || {};
  const error = data.error || data;
  return (
    error.projectId ||
    error.project?.id ||
    error.meta?.projectId ||
    error.meta?.project?.id ||
    null
  );
}

async function findProjectWithDomain(token, teamId, domain) {
  const list = await vercel(token, "/v9/projects?limit=100", { teamId });
  const projects = list.projects || [];
  for (const project of projects) {
    try {
      const hit = await getProjectDomain(token, teamId, project.id, domain);
      if (hit) return { project, domain: hit };
    } catch {
      /* skip projects we cannot read */
    }
  }
  return null;
}

async function moveDomain(token, teamId, fromProjectId, toProjectId, domain) {
  return vercel(token, `/v1/projects/${fromProjectId}/domains/${encodeURIComponent(domain)}/move`, {
    method: "POST",
    teamId,
    body: { projectId: toProjectId },
  });
}

async function dnsGuidance(token, teamId, projectId, domain, domainInfo) {
  let config = {};
  try {
    config = await vercel(
      token,
      `/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${encodeURIComponent(projectId)}`,
      { teamId }
    );
  } catch {
    config = {};
  }

  const rows = [];
  const cname = (config.recommendedCNAME || []).slice().sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];
  const ipv4 = (config.recommendedIPv4 || []).slice().sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];
  if (cname?.value) {
    rows.push({
      type: "CNAME",
      name: dnsHostLabel(domain),
      value: Array.isArray(cname.value) ? cname.value[0] : String(cname.value),
      reason: "도메인 업체 DNS에 이 CNAME을 넣으면 연결됩니다.",
    });
  } else if (ipv4?.value) {
    const ips = Array.isArray(ipv4.value) ? ipv4.value : [ipv4.value];
    rows.push({
      type: "A",
      name: dnsHostLabel(domain),
      value: ips.filter(Boolean).join(" / "),
      reason: "루트 도메인은 A 레코드로 연결합니다.",
    });
  }
  for (const row of domainInfo.verification || []) {
    rows.push({
      type: row.type || "TXT",
      name: row.domain || row.name || domain,
      value: row.value,
      reason: row.reason || "소유 확인용 레코드",
    });
  }
  if (!rows.length && !domainInfo.verified) {
    rows.push({
      type: isApexDomain(domain) ? "A" : "CNAME",
      name: dnsHostLabel(domain),
      value: isApexDomain(domain) ? "76.76.21.21" : "cname.vercel-dns.com",
      reason: "도메인 업체 DNS에 이 값을 넣으면 Vercel이 인증합니다.",
    });
  }
  return {
    rows,
    misconfigured: Boolean(config.misconfigured),
    configuredBy: config.configuredBy || null,
    verified: Boolean(domainInfo.verified),
  };
}

async function attachDomain(token, teamId, projectId, domain, onLog) {
  let info = await getProjectDomain(token, teamId, projectId, domain);
  if (info) {
    onLog(`도메인이 이 프로젝트에 있습니다. 인증 상태: ${info.verified ? "완료" : "대기"}`);
  } else {
    onLog(`도메인 연결: ${domain}`);
    try {
      info = await vercel(token, `/v10/projects/${projectId}/domains`, {
        method: "POST",
        teamId,
        body: { name: domain },
      });
      onLog("도메인을 이 프로젝트에 등록했습니다.");
    } catch (err) {
      const msg = String(err.message || "");
      const otherId = conflictProjectId(err);
      if (otherId && otherId !== projectId) {
        onLog("다른 프로젝트에 묶여 있어 이쪽으로 옮깁니다.");
        info = await moveDomain(token, teamId, otherId, projectId, domain);
      } else if (/already in use|already assigned|exists/i.test(msg)) {
        onLog("다른 프로젝트에 있는지 확인합니다.");
        const found = await findProjectWithDomain(token, teamId, domain);
        if (found?.project?.id && found.project.id !== projectId) {
          onLog(`기존 프로젝트(${found.project.name})에서 옮깁니다.`);
          info = await moveDomain(token, teamId, found.project.id, projectId, domain);
        } else {
          info = found?.domain || (await getProjectDomain(token, teamId, projectId, domain));
        }
      } else {
        throw new Error(`도메인을 Vercel 프로젝트에 연결하지 못했습니다. ${msg}`);
      }
    }
  }

  if (!info?.name) {
    info = await getProjectDomain(token, teamId, projectId, domain);
  }
  if (!info?.name) {
    throw new Error("도메인이 이 프로젝트에 붙지 않았습니다. Vercel 도메인 화면을 확인해 주세요.");
  }

  if (!info.verified) {
    try {
      const verified = await vercel(
        token,
        `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}/verify`,
        { method: "POST", teamId }
      );
      if (verified?.verified) {
        info = verified;
        onLog("도메인 인증이 완료되었습니다.");
      }
    } catch {
      onLog("도메인은 등록됐습니다. DNS가 맞으면 인증이 완료됩니다.");
    }
  }

  const dns = await dnsGuidance(token, teamId, projectId, domain, info);
  if (dns.verified) onLog("도메인 연결이 완료되었습니다.");
  else onLog("Vercel에는 연결했습니다. 도메인 업체에서 아래 DNS만 맞추면 열립니다.");
  return { ...info, dns: dns.rows, misconfigured: dns.misconfigured };
}

async function assignDomainAlias(token, teamId, deploymentId, domain, onLog) {
  if (!deploymentId) return;
  try {
    await vercel(token, `/v2/deployments/${deploymentId}/aliases`, {
      method: "POST",
      teamId,
      body: { alias: domain },
    });
    onLog(`배포에 도메인을 붙였습니다: ${domain}`);
  } catch (err) {
    onLog(`도메인 별칭 안내: ${err.message}`);
  }
}

async function startOrWaitDeploy(token, teamId, project, projectName, repo, onLog) {
  const projectId = project.id || projectName;
  await sleep(2000);
  let current = await latestDeployment(token, teamId, projectId);
  if (current && current.readyState !== "ERROR" && current.readyState !== "CANCELED") {
    onLog("이미 시작된 배포를 기다립니다…");
    return waitForDeployment(token, teamId, current.uid || current.id, onLog);
  }

  onLog("프로덕션 배포를 요청합니다…");
  const created = await vercel(token, "/v13/deployments?skipAutoDetectionConfirmation=1", {
    method: "POST",
    teamId,
    body: {
      name: projectName,
      project: projectId,
      target: "production",
      gitSource: gitSourceFrom(project, repo),
    },
  });
  return waitForDeployment(token, teamId, created.id || created.uid, onLog);
}

async function provisionSite(input, onLog = () => {}) {
  const token = String(input.token || "").trim();
  let domain = cleanDomain(input.domain);
  const domainFromName = cleanDomain(input.blogName);
  if ((!domain || !domain.includes(".")) && domainFromName.includes(".")) {
    domain = domainFromName;
  }
  let blogName = String(input.blogName || "").trim();
  if (!blogName || blogName === input.domain || domainFromName === domain) {
    blogName = domain.split(".")[0] || blogName || "매거진";
  }
  const repo = String(input.repo || DEFAULT_REPO).trim() || DEFAULT_REPO;
  let teamId = String(input.teamId || "").trim();

  if (!token) throw new Error("Vercel 토큰을 먼저 저장하세요.");
  if (!domain || !domain.includes(".")) {
    throw new Error("도메인을 올바르게 입력하세요. 예: magazine.agapet.co.kr");
  }

  onLog(`도메인: ${domain}`);
  onLog("계정 확인 중…");
  const user = await vercel(token, "/v2/user");
  const account = user.user || user;
  if (!teamId && account.defaultTeamId) teamId = account.defaultTeamId;

  const projectName = projectNameFromDomain(domain);
  const authSecret = crypto.randomBytes(32).toString("hex");
  const env = [
    { key: "AUTH_SECRET", value: authSecret, type: "encrypted", target: ["production", "preview", "development"] },
    { key: "SITE_NAME", value: blogName, type: "plain", target: ["production", "preview", "development"] },
    { key: "SITE_DOMAIN", value: domain, type: "plain", target: ["production", "preview", "development"] },
  ];

  onLog(`프로젝트 생성: ${projectName}`);
  let project;
  try {
    project = await vercel(token, "/v11/projects", {
      method: "POST",
      teamId,
      body: {
        name: projectName,
        framework: "nextjs",
        gitRepository: { type: "github", repo },
        environmentVariables: env,
      },
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (err.status === 409 || /already exists|conflict|taken|duplicate|이미/i.test(msg)) {
      onLog("이미 있는 프로젝트입니다. 배포를 이어서 진행합니다.");
      project = await getProject(token, teamId, projectName);
    } else if (msg.includes("GitHub")) {
      throw new Error("GitHub 연동이 필요합니다. Vercel에 GitHub 앱을 연결한 뒤 다시 시도하세요.");
    } else {
      throw err;
    }
  }
  project = await getProject(token, teamId, project.id || projectName);
  const projectId = project.id || projectName;

  onLog("Blob 저장소 생성 중…");
  const storeName = `blob-${projectName}`.slice(0, 70);
  let blob = { store: {} };
  try {
    blob = await vercel(token, "/v1/storage/stores/blob", {
      method: "POST",
      teamId,
      body: {
        name: storeName,
        region: "icn1",
        access: "public",
        projectId,
        version: "2",
      },
    });
  } catch (first) {
    try {
      blob = await vercel(token, "/v1/storage/stores/blob", {
        method: "POST",
        teamId,
        body: {
          name: storeName,
          access: "public",
          projectId,
          version: "2",
        },
      });
    } catch (err) {
      onLog(`Blob 안내: ${err.message || first.message}`);
    }
  }
  const store = blob.store || blob;
  const storeId = store.id;
  if (storeId) {
    try {
      onLog("Blob을 프로젝트에 연결 중…");
      await vercel(token, `/v1/storage/stores/${storeId}/connections`, {
        method: "POST",
        teamId,
        body: {
          projectId,
          type: "integration",
          envVarEnvironments: ["production", "preview", "development"],
        },
      });
    } catch (err) {
      onLog(`Blob 연결 안내: ${err.message}`);
    }
  }

  const domainInfo = await attachDomain(token, teamId, projectId, domain, onLog);

  onLog("프로덕션 배포 시작…");
  const ready = await startOrWaitDeploy(token, teamId, project, projectName, repo, onLog);
  await assignDomainAlias(token, teamId, ready.id || ready.uid, domain, onLog);

  const vercelHost = ready.url ? `https://${ready.url}` : `https://${projectName}.vercel.app`;
  onLog("완료되었습니다.");
  return {
    blogName,
    domain,
    projectName,
    projectId,
    vercelHost,
    siteUrl: `https://${domain}`,
    adminUrl: domainInfo.verified ? `https://${domain}/admin` : `${vercelHost}/admin`,
    verified: Boolean(domainInfo.verified),
    dns: domainInfo.dns || [],
    createdAt: new Date().toISOString(),
  };
}

async function verifyToken(token, teamId) {
  const user = await vercel(token, "/v2/user", { teamId });
  let teams = [];
  try {
    const list = await vercel(token, "/v2/teams", { teamId });
    teams = list.teams || [];
  } catch {
    teams = [];
  }
  const account = user.user || user;
  return {
    name: account.name || account.username || "Vercel",
    username: account.username || "",
    teams: teams.map((team) => ({ id: team.id, name: team.name, slug: team.slug })),
  };
}

module.exports = {
  DEFAULT_REPO,
  cleanDomain,
  provisionSite,
  verifyToken,
};
