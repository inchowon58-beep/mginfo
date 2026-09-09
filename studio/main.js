const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const { DEFAULT_REPO, provisionSite, verifyToken } = require("./lib/provision");
const { migrateHistoryToSites, upsertSite } = require("./lib/ledger");

function configPath() {
  return path.join(app.getPath("userData"), "studio-config.json");
}

function readConfig() {
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(configPath(), "utf8")));
  } catch {
    return defaultConfig();
  }
}

function defaultConfig() {
  return {
    token: "",
    teamId: "",
    repo: DEFAULT_REPO,
    history: [],
    sites: [],
    opsHubUrl: "https://magazine.infocs.co.kr",
    opsMasterPassword: "",
  };
}

function normalizeConfig(cfg) {
  const next = { ...defaultConfig(), ...(cfg || {}) };
  next.history = Array.isArray(next.history) ? next.history : [];
  next.sites = migrateHistoryToSites(next.history, next.sites);
  next.opsHubUrl = String(next.opsHubUrl || "https://magazine.infocs.co.kr").trim();
  next.opsMasterPassword = String(next.opsMasterPassword || "");
  return next;
}

async function pushOpsLedger(cfg) {
  const url = String(cfg.opsHubUrl || "").replace(/\/$/, "");
  const password = String(cfg.opsMasterPassword || "").trim();
  if (!url || !password) return { skipped: true };
  const res = await fetch(`${url}/api/ops/sites`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-infocs-master": password,
    },
    body: JSON.stringify({ sites: cfg.sites || [] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `웹 대장 동기화 실패 (${res.status})`);
  return { ok: true, count: (cfg.sites || []).length };
}

async function pullOpsLedger(cfg) {
  const url = String(cfg.opsHubUrl || "").replace(/\/$/, "");
  const password = String(cfg.opsMasterPassword || "").trim();
  if (!url || !password) throw new Error("계정 설정에서 대장 주소와 마스터 비밀번호를 먼저 넣으세요.");
  const res = await fetch(`${url}/api/ops/sites`, {
    headers: { "x-infocs-master": password },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `웹 대장을 가져오지 못했습니다. (${res.status})`);
  return Array.isArray(data.sites) ? data.sites : [];
}

function writeConfig(next) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#0b0a09",
    title: "Infocs Studio",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

ipcMain.handle("studio:load", () => {
  const cfg = readConfig();
  return {
    token: cfg.token ? "••••••••" : "",
    hasToken: Boolean(cfg.token),
    teamId: cfg.teamId || "",
    repo: cfg.repo || DEFAULT_REPO,
    history: cfg.history || [],
    sites: cfg.sites || [],
    opsHubUrl: cfg.opsHubUrl || "https://magazine.infocs.co.kr",
    hasOpsPassword: Boolean(cfg.opsMasterPassword),
  };
});

ipcMain.handle("studio:save-settings", async (_event, payload) => {
  const cfg = readConfig();
  const token = String(payload.token || "").trim();
  if (token && !token.includes("•")) cfg.token = token;
  if (payload.teamId !== undefined) cfg.teamId = String(payload.teamId || "").trim();
  if (payload.repo !== undefined) cfg.repo = String(payload.repo || "").trim() || DEFAULT_REPO;
  if (payload.opsHubUrl !== undefined) {
    cfg.opsHubUrl = String(payload.opsHubUrl || "").trim() || "https://magazine.infocs.co.kr";
  }
  if (payload.opsMasterPassword !== undefined) {
    const secret = String(payload.opsMasterPassword || "").trim();
    if (secret && !secret.includes("•")) cfg.opsMasterPassword = secret;
  }
  if (!cfg.token) throw new Error("Vercel 토큰을 입력하세요.");
  const account = await verifyToken(cfg.token, cfg.teamId);
  writeConfig(cfg);
  return { ok: true, account, teamId: cfg.teamId, repo: cfg.repo };
});

ipcMain.handle("studio:open", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) shell.openExternal(url);
});

ipcMain.handle("studio:create", async (event, payload) => {
  const cfg = readConfig();
  if (!cfg.token) throw new Error("설정에서 Vercel 토큰을 먼저 저장하세요.");
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const result = await provisionSite(
      {
        token: cfg.token,
        teamId: cfg.teamId,
        repo: cfg.repo || DEFAULT_REPO,
        blogName: payload.blogName,
        domain: payload.domain,
        confirmExistingProject: async (projectName) => {
          const { response } = await dialog.showMessageBox(win, {
            type: "warning",
            title: "이미 프로젝트가 있습니다",
            message: "이미 프로젝트가 있습니다.",
            detail: `${projectName}\n\n기존 프로젝트·도메인·저장소는 덮어쓰지 않습니다.\n계속 진행하면 기존 것을 유지한 채 확인만 합니다.`,
            buttons: ["계속 진행", "중지"],
            defaultId: 1,
            cancelId: 1,
            noLink: true,
          });
          return response === 0;
        },
      },
      (line) => event.sender.send("studio:log", line)
    );
    cfg.history = [result, ...(cfg.history || [])].slice(0, 30);
    cfg.sites = upsertSite(cfg.sites, {
      ...result,
      siteName: result.blogName,
      concept: payload.concept,
      vmName: payload.vmName,
      naverId: payload.naverId,
      naverPassword: payload.naverPassword,
      createdAt: result.createdAt,
    });
    writeConfig(cfg);
    try {
      const synced = await pushOpsLedger(cfg);
      if (!synced.skipped) result.opsSynced = true;
    } catch (err) {
      result.opsSyncError = err instanceof Error ? err.message : "웹 대장 동기화 실패";
    }
    if (result.alreadyConnected) {
      await dialog.showMessageBox(win, {
        type: "info",
        title: "도메인 안내",
        message: "해당 도메인은 이미 연결 상태이므로 추가 도메인 설정을 하세요.",
        buttons: ["확인"],
        defaultId: 0,
        noLink: true,
      });
    }
    return result;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "사이트 생성에 실패했습니다.");
  }
});

ipcMain.handle("studio:save-site", async (_event, payload) => {
  const cfg = readConfig();
  cfg.sites = upsertSite(cfg.sites, payload || {});
  writeConfig(cfg);
  let ops = { skipped: true };
  try {
    ops = await pushOpsLedger(cfg);
  } catch (err) {
    ops = { error: err instanceof Error ? err.message : "웹 대장 동기화 실패" };
  }
  return { ok: true, sites: cfg.sites, ops };
});

ipcMain.handle("studio:delete-site", async (_event, id) => {
  const cfg = readConfig();
  cfg.sites = (cfg.sites || []).filter((row) => row.id !== id);
  writeConfig(cfg);
  try {
    await pushOpsLedger(cfg);
  } catch {
    /* local delete still stands */
  }
  return { ok: true, sites: cfg.sites };
});

ipcMain.handle("studio:sync-push", async () => {
  const cfg = readConfig();
  return pushOpsLedger(cfg);
});

ipcMain.handle("studio:sync-pull", async () => {
  const cfg = readConfig();
  const remote = await pullOpsLedger(cfg);
  let sites = cfg.sites || [];
  for (const row of remote) {
    sites = upsertSite(sites, row);
  }
  cfg.sites = sites;
  writeConfig(cfg);
  return { ok: true, sites: cfg.sites };
});
