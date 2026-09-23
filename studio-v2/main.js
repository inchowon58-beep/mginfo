const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { readDrafts, writeDrafts, uid, previewHost } = require("./lib/drafts");
const { readSites, upsertSite } = require("./lib/ledger");
const { provisionSite, applyBrandBootstrap, verifyToken, DEFAULT_REPO } = require("./lib/provision");
const { resolveVendorAddress } = require("./lib/auto-address");

function configPath() {
  return path.join(app.getPath("userData"), "brand-studio-config.json");
}

function studioConfigPath() {
  return path.join(app.getPath("appData"), "infocs-studio", "studio-config.json");
}

const SITE_THEME_IDS = ["folio", "press", "night", "journal", "qna", "talk", "portal", "carrot", "studio"];

function hashPick(text, mod) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % Math.max(1, mod);
}

function resolveSiteTheme(choice, keyword, index) {
  const raw = String(choice || "random").trim();
  if (raw && raw !== "random" && SITE_THEME_IDS.includes(raw)) return raw;
  return SITE_THEME_IDS[hashPick(`${keyword}|${index}`, SITE_THEME_IDS.length)] || "folio";
}

function parseNaverMetaMap(raw) {
  const map = {};
  for (const line of String(raw || "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    const idx = text.search(/[|\t]/);
    if (idx < 0) continue;
    const key = text.slice(0, idx).trim();
    const value = text.slice(idx + 1).trim();
    if (key && value) map[key] = value;
  }
  return map;
}

function defaultConfig() {
  return {
    token: "",
    teamId: "",
    repo: DEFAULT_REPO,
    opsHubUrl: "https://magazine.infocs.co.kr",
    opsMasterPassword: "",
    geminiApiKey: "",
    geminiModel: "",
  };
}

function readStudioConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(studioConfigPath(), "utf8"));
    return {
      token: String(raw?.token || "").trim(),
      teamId: String(raw?.teamId || "").trim(),
      repo: String(raw?.repo || "").trim() || DEFAULT_REPO,
      opsHubUrl: String(raw?.opsHubUrl || "").trim() || "https://magazine.infocs.co.kr",
      opsMasterPassword: String(raw?.opsMasterPassword || ""),
      geminiApiKey: String(raw?.geminiApiKey || "").trim(),
      geminiModel: String(raw?.geminiModel || "").trim(),
    };
  } catch {
    return null;
  }
}

function importFromStudio(overwriteToken = true) {
  const fromStudio = readStudioConfig();
  if (!fromStudio) {
    throw new Error("기존 Infocs Studio 설정을 찾지 못했습니다. (AppData\\infocs-studio\\studio-config.json)");
  }
  const prev = readConfig();
  const next = {
    ...prev,
    token: overwriteToken && fromStudio.token ? fromStudio.token : prev.token || fromStudio.token,
    teamId: fromStudio.teamId || prev.teamId,
    repo: fromStudio.repo || prev.repo || DEFAULT_REPO,
    opsHubUrl: fromStudio.opsHubUrl || prev.opsHubUrl,
    opsMasterPassword: fromStudio.opsMasterPassword || prev.opsMasterPassword,
    geminiApiKey: prev.geminiApiKey || fromStudio.geminiApiKey || "",
    geminiModel: prev.geminiModel || fromStudio.geminiModel || "",
  };
  writeConfig(next);
  return next;
}

function ensureConfigHydrated() {
  const cfg = readConfig();
  if (cfg.token) return cfg;
  try {
    return importFromStudio(true);
  } catch {
    return cfg;
  }
}

function readConfig() {
  try {
    return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(configPath(), "utf8")) };
  } catch {
    return defaultConfig();
  }
}

function writeConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf8");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1220,
    height: 880,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function sendLog(event, message) {
  try {
    event.sender.send("brand:log", String(message || ""));
  } catch {
    /* ignore */
  }
}

ipcMain.handle("brand:load", async () => {
  const cfg = ensureConfigHydrated();
  return {
    config: {
      ...cfg,
      token: cfg.token ? `${cfg.token.slice(0, 6)}••••` : "",
      geminiApiKey: cfg.geminiApiKey ? `${cfg.geminiApiKey.slice(0, 6)}••••` : "",
      hasToken: Boolean(cfg.token),
      hasGeminiKey: Boolean(cfg.geminiApiKey),
      importedFromStudio: Boolean(cfg.token && readStudioConfig()?.token),
      studioConfigPath: studioConfigPath(),
    },
    drafts: readDrafts(app.getPath("userData")),
    sites: readSites(app.getPath("userData")),
  };
});

ipcMain.handle("brand:import-studio-settings", async () => {
  const cfg = importFromStudio(true);
  return {
    ok: true,
    config: {
      ...cfg,
      token: cfg.token ? `${cfg.token.slice(0, 6)}••••` : "",
      geminiApiKey: cfg.geminiApiKey ? `${cfg.geminiApiKey.slice(0, 6)}••••` : "",
      hasToken: Boolean(cfg.token),
      hasGeminiKey: Boolean(cfg.geminiApiKey),
      studioConfigPath: studioConfigPath(),
    },
  };
});

ipcMain.handle("brand:save-settings", async (_e, payload) => {
  const prev = readConfig();
  const nextToken = String(payload?.token || "").trim();
  const nextGemini = String(payload?.geminiApiKey || "").trim();
  const cfg = {
    ...prev,
    token: nextToken && !nextToken.includes("•") ? nextToken : prev.token,
    teamId: String(payload?.teamId || "").trim(),
    repo: String(payload?.repo || "").trim() || DEFAULT_REPO,
    opsHubUrl: String(payload?.opsHubUrl || "").trim() || "https://magazine.infocs.co.kr",
    opsMasterPassword: String(payload?.opsMasterPassword || ""),
    geminiApiKey: nextGemini && !nextGemini.includes("•") ? nextGemini : prev.geminiApiKey || "",
    geminiModel: String(payload?.geminiModel || "").trim() || prev.geminiModel || "",
  };
  writeConfig(cfg);
  return {
    ok: true,
    config: {
      ...cfg,
      token: cfg.token ? `${cfg.token.slice(0, 6)}••••` : "",
      geminiApiKey: cfg.geminiApiKey ? `${cfg.geminiApiKey.slice(0, 6)}••••` : "",
      hasToken: Boolean(cfg.token),
      hasGeminiKey: Boolean(cfg.geminiApiKey),
    },
  };
});

ipcMain.handle("brand:verify-token", async () => {
  const cfg = ensureConfigHydrated();
  if (!cfg.token) throw new Error("Vercel 토큰을 저장하세요. (기존 스튜디오 설정 가져오기 가능)");
  return verifyToken(cfg.token, cfg.teamId);
});

ipcMain.handle("brand:save-draft", async (_e, payload) => {
  const drafts = readDrafts(app.getPath("userData"));
  const now = new Date().toISOString();
  const id = String(payload?.id || "").trim() || uid();
  const keywords = Array.isArray(payload?.keywords)
    ? payload.keywords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const next = {
    id,
    title: String(payload?.title || keywords[0] || "브랜드 초안").trim(),
    apexDomain: String(payload?.apexDomain || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, ""),
    keywords,
    siteTheme: String(payload?.siteTheme || "random"),
    naverId: String(payload?.naverId || "").trim(),
    naverPassword: String(payload?.naverPassword || "").trim(),
    naverSiteVerification: String(payload?.naverSiteVerification || "").trim(),
    naverMetaMap: String(payload?.naverMetaMap || ""),
    mainLanding: payload?.mainLanding || {},
    notes: String(payload?.notes || ""),
    createdAt: drafts.find((d) => d.id === id)?.createdAt || now,
    updatedAt: now,
  };
  const idx = drafts.findIndex((d) => d.id === id);
  if (idx >= 0) drafts[idx] = next;
  else drafts.unshift(next);
  writeDrafts(app.getPath("userData"), drafts);
  return { ok: true, drafts, draft: next };
});

ipcMain.handle("brand:delete-draft", async (_e, id) => {
  const drafts = readDrafts(app.getPath("userData")).filter((d) => d.id !== id);
  writeDrafts(app.getPath("userData"), drafts);
  return { ok: true, drafts };
});

ipcMain.handle("brand:preview", async (_e, payload) => {
  const apex = String(payload?.apexDomain || "").trim();
  const keywords = Array.isArray(payload?.keywords) ? payload.keywords : [];
  return keywords.map((keyword) => {
    const row = previewHost(keyword, apex);
    return { keyword, ...row };
  });
});

ipcMain.handle("brand:publish-batch", async (event, payload) => {
  const cfg = ensureConfigHydrated();
  if (!cfg.token) throw new Error("계정 설정에서 Vercel 토큰을 저장하거나, 기존 스튜디오 설정을 가져오세요.");
  const apex = String(payload?.apexDomain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const keywords = Array.isArray(payload?.keywords)
    ? payload.keywords.map((k) => String(k || "").trim()).filter(Boolean)
    : [];
  if (!apex || !keywords.length) throw new Error("apex와 키워드를 입력하세요.");

  const vendor = payload?.vendor || {};
  const themeChoice = String(payload?.siteTheme || "random").trim() || "random";
  const designId = String(payload?.designId || "scalp-tattoo-v1");
  const imageFolderUrl = String(payload?.imageFolderUrl || "").trim();
  const prompt = String(payload?.prompt || "").trim();
  const businessName = String(vendor.name || "").trim() || "필릭스스칼프";
  const typedAddress = String(vendor.address || "").trim();
  const naverId = String(payload?.naverId || "").trim();
  const naverPassword = String(payload?.naverPassword || "").trim();
  const naverDefault = String(payload?.naverSiteVerification || "").trim();
  const naverMap = parseNaverMetaMap(payload?.naverMetaMap);

  const results = [];
  for (let i = 0; i < keywords.length; i += 1) {
    const keyword = keywords[i];
    const { host, punycode } = previewHost(keyword, apex);
    const domain = punycode || host;
    const siteTheme = resolveSiteTheme(themeChoice, keyword, i);
    const naverSiteVerification = naverMap[keyword] || naverDefault;
    const address = resolveVendorAddress({
      address: typedAddress,
      keyword,
      name: businessName,
    });
    sendLog(event, `\n===== [${i + 1}/${keywords.length}] ${keyword} → ${domain} =====`);
    sendLog(event, `블로그 디자인: ${siteTheme}${themeChoice === "random" ? " (랜덤)" : ""}`);
    sendLog(event, `주소: ${address}${typedAddress ? "" : " (자동)"}`);
    if (naverSiteVerification) sendLog(event, "네이버 인증 메타: 적용 예정");
    if (!domain || !domain.includes(".")) {
      results.push({ keyword, ok: false, error: "도메인 미리보기 실패" });
      continue;
    }
    const variationSeed = `${keyword}|${businessName}|${apex}|${siteTheme}|${i}`;
    try {
      const provisioned = await provisionSite(
        {
          token: cfg.token,
          teamId: cfg.teamId,
          repo: cfg.repo,
          domain,
          blogName: keyword,
          masterPassword: cfg.opsMasterPassword,
          naverSiteVerification,
          geminiApiKey: cfg.geminiApiKey,
          geminiModel: cfg.geminiModel,
          confirmExistingProject: async () => true,
        },
        (msg) => sendLog(event, msg)
      );

      const mainLanding = {
        enabled: true,
        designId,
        vendor: {
          name: businessName,
          keyword,
          phone: String(vendor.phone || "").trim(),
          address,
          businessNumber: String(vendor.businessNumber || "").trim(),
          kakao: String(vendor.kakao || "").trim(),
          industry: "두피문신",
          region: "",
          intro: "",
          website: "",
          strengths: "",
        },
        imageFolderUrl,
        slots: {},
        prompt,
        variationSeed,
      };

      if (!cfg.geminiApiKey) {
        sendLog(event, "경고: 계정 설정에 Gemini API Key가 없습니다. 메인 내용은 기본 원고만 적용됩니다.");
      } else {
        sendLog(event, "제미나이 키로 메인 내용 보충을 시도합니다…");
      }
      sendLog(event, "메인랜딩·블로그 테마 적용 중…");
      await applyBrandBootstrap(
        [provisioned.siteUrl, provisioned.vercelHost],
        {
          siteName: keyword,
          company: businessName,
          phone: mainLanding.vendor.phone,
          address,
          bizNo: mainLanding.vendor.businessNumber,
          siteTheme,
          mainLanding,
          enrich: true,
          ...(cfg.geminiApiKey ? { geminiApiKey: cfg.geminiApiKey } : {}),
          ...(cfg.geminiModel ? { geminiModel: cfg.geminiModel } : {}),
          ...(naverSiteVerification ? { naverSiteVerification } : {}),
        },
        cfg.opsMasterPassword,
        (msg) => sendLog(event, msg)
      );

      const sites = upsertSite(app.getPath("userData"), {
        keyword,
        siteName: keyword,
        domain: provisioned.domain,
        apexDomain: apex,
        siteTheme,
        designId,
        variationSeed,
        address,
        naverId,
        naverPassword,
        naverSiteVerification: naverSiteVerification || "",
        projectName: provisioned.projectName,
        vercelHost: provisioned.vercelHost,
        siteUrl: provisioned.siteUrl,
        adminUrl: provisioned.adminUrl,
        verified: provisioned.verified,
        createdAt: provisioned.createdAt,
        dns: provisioned.dns,
      });
      results.push({
        keyword,
        ok: true,
        siteTheme,
        address,
        variationSeed,
        ...provisioned,
        dns: provisioned.dns,
      });
      sendLog(event, `저장됨 (로컬 대장 ${sites.length}개)`);
    } catch (err) {
      sendLog(event, `실패: ${err.message}`);
      results.push({ keyword, ok: false, error: err.message });
    }
  }

  return {
    ok: true,
    results,
    sites: readSites(app.getPath("userData")),
  };
});

ipcMain.handle("brand:update-site", async (_e, payload) => {
  const cfg = ensureConfigHydrated();
  const domain = String(payload?.domain || payload?.id || "")
    .trim()
    .toLowerCase();
  if (!domain) throw new Error("수정할 사이트를 선택하세요.");
  const sites = readSites(app.getPath("userData"));
  const current = sites.find((row) => String(row.domain || row.id || "").toLowerCase() === domain);
  if (!current) throw new Error("대장에서 사이트를 찾지 못했습니다.");

  const naverSiteVerification = String(
    payload?.naverSiteVerification !== undefined ? payload.naverSiteVerification : current.naverSiteVerification || ""
  ).trim();
  const naverId = String(payload?.naverId !== undefined ? payload.naverId : current.naverId || "").trim();
  const naverPassword = String(
    payload?.naverPassword !== undefined ? payload.naverPassword : current.naverPassword || ""
  ).trim();
  const address = String(payload?.address !== undefined ? payload.address : current.address || "").trim();
  const siteTheme = String(payload?.siteTheme || current.siteTheme || "folio").trim();

  const nextSites = upsertSite(app.getPath("userData"), {
    ...current,
    naverSiteVerification,
    naverId,
    naverPassword,
    address,
    siteTheme,
  });

  let applied = false;
  if (cfg.opsMasterPassword && (current.siteUrl || current.vercelHost)) {
    applied = await applyBrandBootstrap(
      [current.siteUrl, current.vercelHost],
      {
        ...(address ? { address } : {}),
        ...(siteTheme ? { siteTheme } : {}),
        ...(naverSiteVerification ? { naverSiteVerification } : {}),
      },
      cfg.opsMasterPassword,
      () => {}
    );
  }

  return { ok: true, sites: nextSites, applied };
});

ipcMain.handle("brand:open", async (_e, url) => {
  if (url) await shell.openExternal(String(url));
  return { ok: true };
});
