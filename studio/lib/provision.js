const crypto = require("crypto");

const API = "https://api.vercel.com";
const DEFAULT_REPO = "inchowon58-beep/mginfo";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanDomain(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
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

async function provisionSite(input, onLog = () => {}) {
  const token = String(input.token || "").trim();
  const blogName = String(input.blogName || "").trim();
  const domain = cleanDomain(input.domain);
  const repo = String(input.repo || DEFAULT_REPO).trim() || DEFAULT_REPO;
  let teamId = String(input.teamId || "").trim();

  if (!token) throw new Error("Vercel 토큰을 먼저 저장하세요.");
  if (!blogName) throw new Error("블로그 이름을 입력하세요.");
  if (!domain || !domain.includes(".")) throw new Error("도메인을 올바르게 입력하세요. 예: magazine.example.co.kr");

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
    if (String(err.message || "").toLowerCase().includes("already exists")) {
      throw new Error(`같은 이름의 프로젝트가 이미 있습니다: ${projectName}`);
    }
    if (String(err.message || "").includes("GitHub")) {
      throw new Error("GitHub 연동이 필요합니다. Vercel에 GitHub 앱을 연결한 뒤 다시 시도하세요.");
    }
    throw err;
  }
  const projectId = project.id || projectName;

  onLog("Blob 저장소 생성 중…");
  const storeName = `blob-${projectName}`.slice(0, 70);
  let blob;
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
  } catch {
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

  onLog(`도메인 연결: ${domain}`);
  let domainInfo = {};
  try {
    domainInfo = await vercel(token, `/v10/projects/${projectId}/domains`, {
      method: "POST",
      teamId,
      body: { name: domain },
    });
  } catch (err) {
    onLog(`도메인 연결 안내: ${err.message}`);
  }

  onLog("프로덕션 배포 시작…");
  const gitSource = project.link?.repoId
    ? { type: "github", ref: "main", repoId: project.link.repoId }
    : { type: "github", ref: "main", repo };
  const deployment = await vercel(token, "/v13/deployments?skipAutoDetectionConfirmation=1", {
    method: "POST",
    teamId,
    body: {
      name: projectName,
      project: projectId,
      target: "production",
      withLatestCommit: true,
      gitSource,
    },
  });
  const ready = await waitForDeployment(token, teamId, deployment.id, onLog);

  const vercelHost = ready.url ? `https://${ready.url}` : `https://${projectName}.vercel.app`;
  const verification = domainInfo.verification || [];
  const dns = verification.map((row) => ({
    type: row.type,
    name: row.domain || row.name || domain,
    value: row.value,
    reason: row.reason,
  }));
  if (!dns.length && domainInfo.verified === false) {
    dns.push({
      type: "A / CNAME",
      name: domain,
      value: "Vercel이 안내하는 레코드",
      reason: "도메인 업체에서 네임서버 또는 A/CNAME을 Vercel 값으로 바꾸세요.",
    });
  }

  onLog("완료되었습니다.");
  return {
    blogName,
    domain,
    projectName,
    projectId,
    vercelHost,
    siteUrl: `https://${domain}`,
    adminUrl: `https://${domain}/admin`,
    verified: Boolean(domainInfo.verified),
    dns,
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
