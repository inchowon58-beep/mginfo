const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const { DEFAULT_REPO, provisionSite, verifyToken } = require("./lib/provision");

function configPath() {
  return path.join(app.getPath("userData"), "studio-config.json");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return { token: "", teamId: "", repo: DEFAULT_REPO, history: [] };
  }
}

function writeConfig(next) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 960,
    minHeight: 680,
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
  };
});

ipcMain.handle("studio:save-settings", async (_event, payload) => {
  const cfg = readConfig();
  const token = String(payload.token || "").trim();
  if (token && !token.includes("•")) cfg.token = token;
  if (payload.teamId !== undefined) cfg.teamId = String(payload.teamId || "").trim();
  if (payload.repo !== undefined) cfg.repo = String(payload.repo || "").trim() || DEFAULT_REPO;
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
    writeConfig(cfg);
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
