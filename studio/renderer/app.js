const views = {
  create: document.getElementById("view-create"),
  history: document.getElementById("view-history"),
  settings: document.getElementById("view-settings"),
};

function show(name) {
  Object.entries(views).forEach(([key, node]) => node.classList.toggle("show", key === name));
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
const accountLabel = document.getElementById("account-label");

function addLog(line) {
  const item = document.createElement("li");
  item.textContent = line;
  logEl.appendChild(item);
  logEl.scrollTop = logEl.scrollHeight;
}

window.studio.onLog(addLog);

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResult(row) {
  const dns = (row.dns || [])
    .map(
      (item) =>
        `<div>${escapeHtml(item.type)} · 호스트 <b>${escapeHtml(item.name)}</b> → <b>${escapeHtml(item.value)}</b></div>`
    )
    .join("");
  const domainStatus = row.verified
    ? "도메인이 이 사이트에 연결되었습니다."
    : "도메인은 Vercel 프로젝트에 등록했습니다. 아래 DNS를 도메인 업체에 넣으면 주소가 열립니다.";
  resultEl.hidden = false;
  resultEl.innerHTML = `
    <div>${domainStatus}</div>
    <div>지금 열리는 주소: <a href="${row.vercelHost}" data-open-result>${escapeHtml(row.vercelHost)}</a></div>
    <div>연결할 도메인: <a href="${row.siteUrl}" data-open-result>${escapeHtml(row.siteUrl)}</a></div>
    <div>관리자: <a href="${row.adminUrl}" data-open-result>${escapeHtml(row.adminUrl)}</a> · blog / blog1234</div>
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
  document.getElementById("token").placeholder = data.hasToken ? "저장된 토큰이 있습니다. 바꾸려면 새로 입력" : "vercel_ 로 시작하는 토큰";
  accountLabel.textContent = data.hasToken ? "Vercel 연결됨" : "토큰 미연결";
  renderHistory(data.history);
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
    });
    accountLabel.textContent = saved.account?.name ? `${saved.account.name} 연결됨` : "Vercel 연결됨";
    status.textContent = "설정을 저장했습니다.";
    document.getElementById("token").value = "";
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
    });
    progressTitle.textContent = result.blogName;
    progressState.textContent = "완료";
    addLog("사이트가 준비되었습니다.");
    renderResult(result);
    const data = await window.studio.load();
    renderHistory(data.history);
  } catch (err) {
    progressState.textContent = "실패";
    const raw = String(err.message || "생성 실패");
    addLog(raw.replace(/^Error invoking remote method '[^']+': (Error:\s*)?/i, ""));
  } finally {
    btn.disabled = false;
  }
});

boot();
