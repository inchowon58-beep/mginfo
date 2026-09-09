const views = {
  create: document.getElementById("view-create"),
  ledger: document.getElementById("view-ledger"),
  history: document.getElementById("view-history"),
  settings: document.getElementById("view-settings"),
};

let sites = [];
let showPasswords = {};
let apexStatsOpen = false;

function show(name) {
  Object.entries(views).forEach(([key, node]) => node?.classList.toggle("show", key === name));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => show(btn.dataset.view));
});

document.querySelectorAll("[data-open]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.studio.open(link.href);
  });
});

const logEl = document.getElementById("log");
const resultEl = document.getElementById("result");
const progressCard = document.getElementById("progress-card");
const progressTitle = document.getElementById("progress-title");
const progressState = document.getElementById("progress-state");
const historyList = document.getElementById("history-list");
const ledgerList = document.getElementById("ledger-list");
const accountLabel = document.getElementById("account-label");
const apexHint = document.getElementById("apex-hint");
const editApexHint = document.getElementById("edit-apex-hint");
const ledgerForm = document.getElementById("ledger-form");
const ledgerSyncStatus = document.getElementById("ledger-sync-status");
const ledgerFormStatus = document.getElementById("ledger-form-status");

document.getElementById("ledger-stats")?.addEventListener("click", (event) => {
  const btn = event.target.closest("#apex-stats-toggle");
  if (!btn) return;
  event.preventDefault();
  apexStatsOpen = !apexStatsOpen;
  renderLedgerStats();
});

function addLog(line) {
  const item = document.createElement("li");
  item.textContent = line;
  logEl.appendChild(item);
  logEl.scrollTop = logEl.scrollHeight;
}

window.studio.onLog(addLog);

function cleanHost(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function apexDomain(host) {
  const parts = cleanHost(host).split(".").filter(Boolean);
  if (parts.length < 2) return cleanHost(host);
  const lastTwo = parts.slice(-2).join(".");
  const kr = ["co.kr", "or.kr", "ne.kr", "go.kr", "ac.kr", "re.kr", "pe.kr"];
  if (kr.includes(lastTwo) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function groupByApex(list) {
  const map = new Map();
  for (const site of list || []) {
    const key = site.apexDomain || apexDomain(site.domain) || "(도메인 없음)";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(site);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ko"))
    .map(([apex, rows]) => ({
      apex,
      count: rows.length,
      sites: rows.slice().sort((a, b) => a.domain.localeCompare(b.domain, "ko")),
    }));
}

function filterSites(list, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return list || [];
  return (list || []).filter((site) =>
    [site.siteName, site.domain, site.apexDomain, site.concept, site.vmName, site.naverId].join(" ").toLowerCase().includes(q)
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDay(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftLocalDay(base, delta) {
  return localDayKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta));
}

function ledgerOverview(list) {
  const rows = Array.isArray(list) ? list : [];
  const now = new Date();
  const today = localDayKey(now);
  const yesterday = shiftLocalDay(now, -1);
  const twoDaysAgo = shiftLocalDay(now, -2);
  let todayCount = 0;
  let yesterdayCount = 0;
  let twoDaysCount = 0;
  for (const site of rows) {
    const day = localDayKey(site.createdAt);
    if (day === today) todayCount += 1;
    else if (day === yesterday) yesterdayCount += 1;
    else if (day === twoDaysAgo) twoDaysCount += 1;
  }
  const groups = groupByApex(rows)
    .slice()
    .sort((a, b) => b.count - a.count || a.apex.localeCompare(b.apex, "ko"));
  return {
    total: rows.length,
    today: todayCount,
    yesterday: yesterdayCount,
    twoDaysAgo: twoDaysCount,
    todayLabel: today,
    yesterdayLabel: yesterday,
    twoDaysLabel: twoDaysAgo,
    apexCount: groups.length,
    groups,
  };
}

function renderLedgerStats() {
  const el = document.getElementById("ledger-stats");
  if (!el) return;
  const stats = ledgerOverview(sites);
  const apexRows = stats.groups
    .map(
      (group) => `
        <div class="apex-stat">
          <span>${escapeHtml(group.apex)}</span>
          <b>${group.count}</b>
        </div>`
    )
    .join("");
  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <p>전체 등록 사이트</p>
        <strong>${stats.total}</strong>
        <small>대장에 있는 사이트</small>
      </div>
      <div class="stat-card">
        <p>오늘 등록</p>
        <strong>${stats.today}</strong>
        <small>${escapeHtml(stats.todayLabel)}</small>
      </div>
      <div class="stat-card">
        <p>어제 등록</p>
        <strong>${stats.yesterday}</strong>
        <small>${escapeHtml(stats.yesterdayLabel)}</small>
      </div>
      <div class="stat-card">
        <p>2일 전 등록</p>
        <strong>${stats.twoDaysAgo}</strong>
        <small>${escapeHtml(stats.twoDaysLabel)}</small>
      </div>
      <div class="stat-card">
        <p>대표도메인</p>
        <strong>${stats.apexCount}</strong>
        <small>메인 도메인 묶음</small>
      </div>
    </div>
    <div class="apex-stats">
      <div class="apex-stats-head">
        <div>
          <b>대표도메인별 서브도메인</b>
          <p>${stats.apexCount}개 대표도메인 · 개수는 각 묶음의 사이트 수입니다.</p>
        </div>
        <button class="ghost" id="apex-stats-toggle" type="button" aria-expanded="${apexStatsOpen ? "true" : "false"}">${apexStatsOpen ? "접기" : "펼치기"}</button>
      </div>
      <div class="apex-stats-list${apexStatsOpen ? " is-open" : ""}">
        ${stats.groups.length ? apexRows : `<p class="empty">아직 대표도메인이 없습니다.</p>`}
      </div>
    </div>`;
}

function updateApexHint(inputId, hintEl, fallback) {
  const host = cleanHost(document.getElementById(inputId).value);
  if (!host) {
    hintEl.textContent = fallback;
    return;
  }
  const apex = apexDomain(host);
  hintEl.textContent = host === apex ? `메인도메인 사이트입니다: ${apex}` : `메인도메인 묶음: ${apex} · 이 사이트: ${host}`;
}

document.getElementById("domain").addEventListener("input", () => {
  updateApexHint("domain", apexHint, "서브도메인으로 만들면 메인도메인 아래에 자동으로 묶입니다.");
});
document.getElementById("edit-domain").addEventListener("input", () => {
  updateApexHint("edit-domain", editApexHint, "");
});

function renderHistory(rows) {
  if (!rows?.length) {
    historyList.innerHTML = `<p class="empty">아직 만든 사이트가 없습니다.</p>`;
    return;
  }
  historyList.innerHTML = rows
    .map(
      (row) => `
      <article class="history-item">
        <b>${escapeHtml(row.blogName)}</b>
        <span>${escapeHtml(row.domain)}</span>
        <div>
          <a href="${row.vercelHost}" data-hist>${escapeHtml(row.vercelHost)}</a>
        </div>
      </article>`
    )
    .join("");
  historyList.querySelectorAll("[data-hist]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.studio.open(link.href);
    });
  });
}

function renderLedger() {
  renderLedgerStats();
  const query = document.getElementById("ledger-search").value;
  const groups = groupByApex(filterSites(sites, query));
  if (!groups.length) {
    ledgerList.innerHTML = `<div class="panel"><p class="empty">아직 대장에 사이트가 없습니다. 새 사이트를 만들거나 위에서 대장에만 추가하세요.</p></div>`;
    return;
  }
  ledgerList.innerHTML = groups
    .map((group) => {
      const rows = group.sites
        .map((site) => {
          const openPw = Boolean(showPasswords[site.id]);
          const pw = site.naverPassword
            ? openPw
              ? escapeHtml(site.naverPassword)
              : "••••••••"
            : "없음";
          return `
          <div class="site-row" data-id="${escapeHtml(site.id)}">
            <div>
              <b>${escapeHtml(site.domain || "-")}</b>
              <small>${escapeHtml(site.siteName || "이름 없음")} · 생성 ${escapeHtml(formatDay(site.createdAt))}</small>
            </div>
            <div class="meta">
              <span>컨셉 ${escapeHtml(site.concept || "-")}</span>
              <span>VM ${escapeHtml(site.vmName || "-")}</span>
            </div>
            <div class="meta">
              <span>네이버 ${escapeHtml(site.naverId || "-")}</span>
              <span class="${openPw ? "" : "pw-hidden"}">${pw}</span>
            </div>
            <div class="ops">
              ${site.siteUrl ? `<button class="ghost" data-open-site="${escapeHtml(site.siteUrl)}" type="button">열기</button>` : ""}
              <button class="ghost" data-toggle-pw="${escapeHtml(site.id)}" type="button">${openPw ? "비번숨김" : "비번보기"}</button>
              <button class="ghost" data-edit="${escapeHtml(site.id)}" type="button">수정</button>
              <button class="ghost" data-del="${escapeHtml(site.id)}" type="button">삭제</button>
            </div>
          </div>`;
        })
        .join("");
      return `
        <section class="ledger-group">
          <h2>${escapeHtml(group.apex)}</h2>
          <p class="count">서브도메인 ${group.count}개</p>
          ${rows}
        </section>`;
    })
    .join("");

  ledgerList.querySelectorAll("[data-open-site]").forEach((btn) => {
    btn.addEventListener("click", () => window.studio.open(btn.getAttribute("data-open-site")));
  });
  ledgerList.querySelectorAll("[data-toggle-pw]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-pw");
      showPasswords[id] = !showPasswords[id];
      renderLedger();
    });
  });
  ledgerList.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.getAttribute("data-edit")));
  });
  ledgerList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 사이트를 대장에서 삭제할까요? 실제 배포는 지우지 않습니다.")) return;
      const data = await window.studio.deleteSite(btn.getAttribute("data-del"));
      sites = data.sites || [];
      renderLedger();
    });
  });
}

function startEdit(id) {
  const site = sites.find((row) => row.id === id);
  ledgerForm.hidden = false;
  document.getElementById("ledger-form-title").textContent = site ? "사이트 수정" : "대장에 사이트 추가";
  document.getElementById("edit-id").value = site?.id || "";
  document.getElementById("edit-name").value = site?.siteName || "";
  document.getElementById("edit-domain").value = site?.domain || "";
  document.getElementById("edit-concept").value = site?.concept || "";
  document.getElementById("edit-vm").value = site?.vmName || "";
  document.getElementById("edit-naver-id").value = site?.naverId || "";
  document.getElementById("edit-naver-pw").value = site?.naverPassword || "";
  ledgerFormStatus.textContent = "";
  updateApexHint("edit-domain", editApexHint, "");
  ledgerForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideLedgerForm() {
  ledgerForm.hidden = true;
  document.getElementById("edit-id").value = "";
  ledgerForm.reset();
}

document.getElementById("ledger-add-btn").addEventListener("click", () => startEdit(""));
document.getElementById("ledger-cancel-btn").addEventListener("click", hideLedgerForm);
document.getElementById("ledger-search").addEventListener("input", renderLedger);

ledgerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ledgerFormStatus.textContent = "저장 중…";
  try {
    const data = await window.studio.saveSite({
      id: document.getElementById("edit-id").value,
      siteName: document.getElementById("edit-name").value,
      domain: document.getElementById("edit-domain").value,
      concept: document.getElementById("edit-concept").value,
      vmName: document.getElementById("edit-vm").value,
      naverId: document.getElementById("edit-naver-id").value,
      naverPassword: document.getElementById("edit-naver-pw").value,
    });
    sites = data.sites || [];
    renderLedger();
    hideLedgerForm();
    ledgerSyncStatus.textContent = data.ops?.error
      ? `로컬 저장됨. 웹 동기화: ${data.ops.error}`
      : data.ops?.skipped
        ? "이 컴퓨터 대장에 저장했습니다. 웹에 올리려면 계정 설정에 마스터 비밀번호를 넣으세요."
        : "저장하고 웹 대장에도 올렸습니다.";
  } catch (err) {
    ledgerFormStatus.textContent = err.message || "저장 실패";
    ledgerFormStatus.classList.add("error");
  }
});

async function runSync(kind) {
  ledgerSyncStatus.textContent = kind === "pull" ? "웹에서 가져오는 중…" : "웹에 올리는 중…";
  try {
    const data = kind === "pull" ? await window.studio.syncPull() : await window.studio.syncPush();
    if (data.skipped) {
      ledgerSyncStatus.textContent = "계정 설정에서 웹 대장 주소와 마스터 비밀번호를 먼저 저장하세요.";
      return;
    }
    if (kind === "pull") {
      sites = data.sites || [];
      renderLedger();
      ledgerSyncStatus.textContent = "웹 대장을 가져왔습니다.";
    } else {
      ledgerSyncStatus.textContent = `웹 대장에 ${data.count ?? sites.length}개를 올렸습니다.`;
    }
  } catch (err) {
    ledgerSyncStatus.textContent = err.message || "동기화 실패";
  }
}

document.getElementById("ops-pull-btn").addEventListener("click", () => runSync("pull"));
document.getElementById("ops-push-btn").addEventListener("click", () => runSync("push"));

function renderResult(row) {
  const dns = (row.dns || [])
    .map(
      (item) =>
        `<div>${escapeHtml(item.type)} · 호스트 <b>${escapeHtml(item.name)}</b> → <b>${escapeHtml(item.value)}</b></div>`
    )
    .join("");
  const domainStatus = row.alreadyConnected
    ? "해당 도메인은 이미 연결 상태이므로 추가 도메인 설정을 하세요."
    : row.verified
      ? "도메인이 이 사이트에 연결되었습니다."
      : "도메인은 Vercel 프로젝트에 등록했습니다. 아래 DNS를 도메인 업체에 넣으면 주소가 열립니다.";
  const opsLine = row.opsSyncError
    ? `<div class="error">웹 대장 동기화: ${escapeHtml(row.opsSyncError)}</div>`
    : row.opsSynced
      ? "<div>사이트 대장과 웹 대장에 기록을 남겼습니다.</div>"
      : "<div>이 컴퓨터 사이트 대장에 기록을 남겼습니다.</div>";
  resultEl.hidden = false;
  resultEl.innerHTML = `
    <div>${domainStatus}</div>
    <div>지금 열리는 주소: <a href="${row.vercelHost}" data-open-result>${escapeHtml(row.vercelHost)}</a></div>
    <div>연결할 도메인: <a href="${row.siteUrl}" data-open-result>${escapeHtml(row.siteUrl)}</a></div>
    <div>관리자: <a href="${row.adminUrl}" data-open-result>${escapeHtml(row.adminUrl)}</a> · blog / blog1234</div>
    ${opsLine}
    ${dns ? `<div>DNS 설정<br>${dns}</div>` : ""}
  `;
  resultEl.querySelectorAll("[data-open-result]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.studio.open(link.href);
    });
  });
}

async function boot() {
  const data = await window.studio.load();
  document.getElementById("repo").value = data.repo || "";
  document.getElementById("teamId").value = data.teamId || "";
  document.getElementById("opsHubUrl").value = data.opsHubUrl || "https://magazine.infocs.co.kr";
  document.getElementById("opsMasterPassword").placeholder = data.hasOpsPassword
    ? "저장된 비밀번호가 있습니다. 바꾸려면 새로 입력"
    : "허브 마스터 비밀번호";
  document.getElementById("token").placeholder = data.hasToken
    ? "저장된 토큰이 있습니다. 바꾸려면 새로 입력"
    : "vercel_ 로 시작하는 토큰";
  accountLabel.textContent = data.hasToken ? "Vercel 연결됨" : "토큰 미연결";
  sites = data.sites || [];
  renderHistory(data.history);
  renderLedger();
  if (!data.hasToken) show("settings");
}

document.getElementById("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.getElementById("settings-status");
  status.textContent = "확인 중…";
  status.classList.remove("error");
  try {
    const saved = await window.studio.saveSettings({
      token: document.getElementById("token").value,
      repo: document.getElementById("repo").value,
      teamId: document.getElementById("teamId").value,
      opsHubUrl: document.getElementById("opsHubUrl").value,
      opsMasterPassword: document.getElementById("opsMasterPassword").value,
    });
    accountLabel.textContent = saved.account?.name ? `${saved.account.name} 연결됨` : "Vercel 연결됨";
    status.textContent = "설정을 저장했습니다.";
    document.getElementById("token").value = "";
    document.getElementById("opsMasterPassword").value = "";
  } catch (err) {
    status.textContent = err.message || "저장 실패";
    status.classList.add("error");
  }
});

document.getElementById("create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = document.getElementById("create-btn");
  progressCard.hidden = false;
  resultEl.hidden = true;
  resultEl.innerHTML = "";
  logEl.innerHTML = "";
  progressTitle.textContent = "사이트를 만들고 있습니다";
  progressState.textContent = "진행 중";
  btn.disabled = true;
  try {
    const result = await window.studio.createSite({
      blogName: document.getElementById("blogName").value,
      domain: document.getElementById("domain").value,
      concept: document.getElementById("concept").value,
      vmName: document.getElementById("vmName").value,
      naverId: document.getElementById("naverId").value,
      naverPassword: document.getElementById("naverPassword").value,
    });
    progressTitle.textContent = result.blogName;
    progressState.textContent = "완료";
    addLog("사이트가 준비되었습니다.");
    renderResult(result);
    const data = await window.studio.load();
    sites = data.sites || [];
    renderHistory(data.history);
    renderLedger();
  } catch (err) {
    progressState.textContent = "실패";
    const raw = String(err.message || "생성 실패");
    addLog(raw.replace(/^Error invoking remote method '[^']+': (Error:\s*)?/i, ""));
  } finally {
    btn.disabled = false;
  }
});

boot();
