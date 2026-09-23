const SITE_PAGE_SIZE = 30;

const state = {
  draftId: "",
  drafts: [],
  sites: [],
  sitePage: 1,
  editingDomain: "",
  config: {},
  offLog: null,
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, isError) {
  const el = $("status");
  el.textContent = text || "";
  el.style.color = isError ? "#f0a0a0" : "";
}

function parseKeywords(raw) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectPayload() {
  return {
    id: state.draftId || undefined,
    title: $("title").value.trim(),
    apexDomain: $("apexDomain").value.trim(),
    keywords: parseKeywords($("keywords").value),
    siteTheme: $("siteTheme").value || "random",
    designId: $("designId").value,
    imageFolderUrl: $("imageFolderUrl").value.trim(),
    prompt: $("prompt").value.trim(),
    seoTitleSuffix: $("seoTitleSuffix").value.trim(),
    naverId: $("naverId").value.trim(),
    naverPassword: $("naverPassword").value.trim(),
    naverSiteVerification: $("naverSiteVerification").value.trim(),
    naverMetaMap: $("naverMetaMap").value,
    vendor: {
      name: $("vendorName").value.trim(),
      phone: $("vendorPhone").value.trim(),
      kakao: $("vendorKakao").value.trim(),
      address: $("vendorAddress").value.trim(),
      businessNumber: $("vendorBiz").value.trim(),
    },
    mainLanding: {
      enabled: true,
      designId: $("designId").value,
      vendor: {
        name: $("vendorName").value.trim(),
        keyword: "",
        phone: $("vendorPhone").value.trim(),
        kakao: $("vendorKakao").value.trim(),
        address: $("vendorAddress").value.trim(),
        businessNumber: $("vendorBiz").value.trim(),
        industry: "두피문신",
        region: "",
        intro: "",
        website: "",
        strengths: "",
      },
      imageFolderUrl: $("imageFolderUrl").value.trim(),
      slots: {},
      prompt: $("prompt").value.trim(),
      seoTitleSuffix: $("seoTitleSuffix").value.trim(),
      variationSeed: "",
    },
  };
}

function fillForm(draft) {
  state.draftId = draft?.id || "";
  $("title").value = draft?.title || "";
  $("apexDomain").value = draft?.apexDomain || "";
  $("keywords").value = (draft?.keywords || []).join("\n");
  $("siteTheme").value = draft?.siteTheme || "random";
  const ml = draft?.mainLanding || {};
  const vendor = ml.vendor || {};
  $("designId").value = ml.designId === "brand-landing-v1" ? "scalp-tattoo-v1" : ml.designId || "scalp-tattoo-v1";
  $("vendorName").value = vendor.name || "";
  $("vendorPhone").value = vendor.phone || "";
  $("vendorKakao").value = vendor.kakao || "";
  $("vendorAddress").value = vendor.address || "";
  $("vendorBiz").value = vendor.businessNumber || "";
  $("prompt").value = ml.prompt || "";
  $("seoTitleSuffix").value = ml.seoTitleSuffix || draft?.seoTitleSuffix || "";
  $("imageFolderUrl").value = ml.imageFolderUrl || "";
  $("naverId").value = draft?.naverId || "";
  $("naverPassword").value = draft?.naverPassword || "";
  $("naverSiteVerification").value = draft?.naverSiteVerification || "";
  $("naverMetaMap").value = draft?.naverMetaMap || "";
}

function renderPreviews(rows) {
  const body = $("preview-body");
  body.innerHTML = "";
  for (const row of rows || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.keyword}</td><td>${row.host}</td><td>${row.punycode}</td>`;
    body.appendChild(tr);
  }
}

function renderSites() {
  const list = $("site-list");
  const pager = $("site-pager");
  const countEl = $("site-count");
  list.innerHTML = "";
  pager.innerHTML = "";

  const total = state.sites.length;
  if (!total) {
    if (countEl) countEl.textContent = "";
    list.innerHTML = "<li>아직 발행된 사이트가 없습니다.</li>";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / SITE_PAGE_SIZE));
  if (state.sitePage > totalPages) state.sitePage = totalPages;
  if (state.sitePage < 1) state.sitePage = 1;

  const start = (state.sitePage - 1) * SITE_PAGE_SIZE;
  const pageRows = state.sites.slice(start, start + SITE_PAGE_SIZE);
  if (countEl) {
    countEl.textContent = `전체 ${total}개 · ${state.sitePage}/${totalPages}페이지 (페이지당 ${SITE_PAGE_SIZE}개)`;
  }

  for (const site of pageRows) {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${site.keyword || site.siteName}</strong><br/><small>${site.domain} · ${site.siteTheme} · ${site.designId}${site.address ? ` · ${site.address}` : ""}${site.naverId ? ` · 네이버 ${site.naverId}` : ""}${site.naverSiteVerification ? " · 메타✓" : ""}</small></div>`;
    const actions = document.createElement("div");
    actions.className = "site-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn";
    editBtn.type = "button";
    editBtn.textContent = "수정";
    editBtn.onclick = () => openSiteEdit(site);
    actions.appendChild(editBtn);
    if (site.siteUrl) {
      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      openBtn.type = "button";
      openBtn.textContent = "열기";
      openBtn.onclick = () => window.brandStudio.open(site.siteUrl);
      actions.appendChild(openBtn);
    }
    li.appendChild(actions);
    list.appendChild(li);
  }

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "pager-btn";
  prev.textContent = "이전";
  prev.disabled = state.sitePage <= 1;
  prev.onclick = () => {
    state.sitePage -= 1;
    renderSites();
  };
  pager.appendChild(prev);

  for (let p = 1; p <= totalPages; p += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `pager-btn${p === state.sitePage ? " is-active" : ""}`;
    btn.textContent = String(p);
    btn.onclick = () => {
      state.sitePage = p;
      renderSites();
    };
    pager.appendChild(btn);
  }

  const next = document.createElement("button");
  next.type = "button";
  next.className = "pager-btn";
  next.textContent = "다음";
  next.disabled = state.sitePage >= totalPages;
  next.onclick = () => {
    state.sitePage += 1;
    renderSites();
  };
  pager.appendChild(next);
}

function openSiteEdit(site) {
  state.editingDomain = site.domain || site.id || "";
  $("site-edit").hidden = false;
  $("site-edit-title").textContent = `${site.keyword || site.siteName} · ${site.domain}`;
  $("edit-naver-meta").value = site.naverSiteVerification || "";
  $("edit-naver-id").value = site.naverId || "";
  $("edit-naver-pw").value = site.naverPassword || "";
  $("edit-address").value = site.address || "";
  $("edit-site-theme").value = site.siteTheme || "folio";
  $("site-edit-status").textContent = "";
  $("site-edit").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeSiteEdit() {
  state.editingDomain = "";
  $("site-edit").hidden = true;
  $("site-edit-status").textContent = "";
}

$("btn-cancel-site").onclick = () => closeSiteEdit();

$("btn-save-site").onclick = async () => {
  if (!state.editingDomain) return;
  $("site-edit-status").textContent = "저장 중…";
  $("site-edit-status").style.color = "";
  try {
    const res = await window.brandStudio.updateSite({
      domain: state.editingDomain,
      naverSiteVerification: $("edit-naver-meta").value,
      naverId: $("edit-naver-id").value,
      naverPassword: $("edit-naver-pw").value,
      address: $("edit-address").value,
      siteTheme: $("edit-site-theme").value,
    });
    state.sites = res.sites || [];
    renderSites();
    $("site-edit-status").textContent = res.applied
      ? "저장했고 라이브 사이트에도 반영했습니다."
      : "로컬 대장에 저장했습니다. (라이브 반영은 마스터 비번·사이트 URL 확인)";
  } catch (err) {
    $("site-edit-status").textContent = err.message;
    $("site-edit-status").style.color = "#f0a0a0";
  }
};

function appendLog(line) {
  const el = $("publish-log");
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("show"));
    btn.classList.add("active");
    $(`view-${btn.dataset.view}`).classList.add("show");
  });
});

$("btn-preview").onclick = async () => {
  try {
    const rows = await window.brandStudio.preview({
      apexDomain: $("apexDomain").value,
      keywords: parseKeywords($("keywords").value),
    });
    renderPreviews(rows);
    setStatus(`미리보기 ${rows.length}건`);
  } catch (err) {
    setStatus(err.message, true);
  }
};

$("btn-save-draft").onclick = async () => {
  try {
    const res = await window.brandStudio.saveDraft(collectPayload());
    state.drafts = res.drafts || [];
    state.draftId = res.draft?.id || state.draftId;
    setStatus("초안 저장됨");
  } catch (err) {
    setStatus(err.message, true);
  }
};

$("btn-publish").onclick = async () => {
  const payload = collectPayload();
  if (!payload.apexDomain || !payload.keywords.length) {
    setStatus("apex와 키워드를 입력하세요.", true);
    return;
  }
  if (!confirm(`${payload.keywords.length}개 사이트를 발행할까요?\n(키워드마다 내용·색이 조금씩 달라집니다)`)) return;
  $("btn-publish").disabled = true;
  $("publish-log").textContent = "";
  setStatus("발행 중…");
  if (state.offLog) state.offLog();
  state.offLog = window.brandStudio.onLog((msg) => appendLog(msg));
  try {
    const res = await window.brandStudio.publishBatch(payload);
    state.sites = res.sites || [];
    renderSites();
    const ok = (res.results || []).filter((r) => r.ok).length;
    const fail = (res.results || []).filter((r) => !r.ok).length;
    setStatus(`완료: 성공 ${ok} · 실패 ${fail}`);
    await window.brandStudio.saveDraft(payload);
  } catch (err) {
    setStatus(err.message, true);
    appendLog(`ERROR ${err.message}`);
  } finally {
    $("btn-publish").disabled = false;
  }
};

$("btn-save-settings").onclick = async () => {
  try {
    const res = await window.brandStudio.saveSettings({
      token: $("token").value,
      teamId: $("teamId").value,
      repo: $("repo").value,
      opsHubUrl: $("opsHubUrl").value,
      opsMasterPassword: $("opsMasterPassword").value,
      geminiApiKey: $("geminiApiKey").value,
      geminiModel: $("geminiModel").value,
    });
    state.config = res.config || {};
    $("settings-status").textContent = state.config.hasGeminiKey
      ? "설정 저장됨 (제미나이 키 포함)"
      : "설정 저장됨 · 제미나이 키 없음 — 메인 내용이 사이트마다 같아질 수 있습니다";
    $("settings-status").style.color = "";
    $("token").value = "";
    $("token").placeholder = state.config.hasToken ? "저장됨 · 바꾸려면 새 토큰 입력" : "vercel_ 로 시작하는 토큰";
    $("geminiApiKey").value = "";
    $("geminiApiKey").placeholder = state.config.hasGeminiKey
      ? "저장됨 · 바꾸려면 새 키 입력"
      : "AIza… (메인 내용 보충·사이트마다 다른 카피)";
  } catch (err) {
    $("settings-status").textContent = err.message;
    $("settings-status").style.color = "#f0a0a0";
  }
};

$("btn-import-studio").onclick = async () => {
  try {
    const res = await window.brandStudio.importStudioSettings();
    state.config = res.config || {};
    $("teamId").value = state.config.teamId || "";
    $("repo").value = state.config.repo || "";
    $("opsHubUrl").value = state.config.opsHubUrl || "";
    $("opsMasterPassword").value = state.config.opsMasterPassword || "";
    $("geminiModel").value = state.config.geminiModel || "";
    $("geminiApiKey").value = "";
    $("geminiApiKey").placeholder = state.config.hasGeminiKey
      ? "저장됨 · 바꾸려면 새 키 입력"
      : "AIza… (메인 내용 보충·사이트마다 다른 카피)";
    $("token").value = "";
    $("token").placeholder = state.config.hasToken ? "기존 스튜디오에서 가져옴 · 저장됨" : "vercel_ 로 시작하는 토큰";
    $("settings-status").textContent = "기존 Infocs Studio 설정을 가져왔습니다.";
    $("settings-status").style.color = "";
  } catch (err) {
    $("settings-status").textContent = err.message;
    $("settings-status").style.color = "#f0a0a0";
  }
};

$("btn-verify").onclick = async () => {
  try {
    const info = await window.brandStudio.verifyToken();
    $("settings-status").textContent = `확인됨: ${info.name || info.username}`;
    $("settings-status").style.color = "";
  } catch (err) {
    $("settings-status").textContent = err.message;
    $("settings-status").style.color = "#f0a0a0";
  }
};

const vercelLink = $("link-vercel-tokens");
if (vercelLink) {
  vercelLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.brandStudio.open("https://vercel.com/account/tokens");
  });
}

async function boot() {
  const data = await window.brandStudio.load();
  state.config = data.config || {};
  state.drafts = data.drafts || [];
  state.sites = data.sites || [];
  $("token").value = "";
  $("token").placeholder = state.config.hasToken ? "저장됨 · 바꾸려면 새 토큰 입력" : "vercel_ 로 시작하는 토큰";
  $("teamId").value = state.config.teamId || "";
  $("repo").value = state.config.repo || "";
  $("opsHubUrl").value = state.config.opsHubUrl || "";
  $("opsMasterPassword").value = state.config.opsMasterPassword || "";
  $("geminiModel").value = state.config.geminiModel || "";
  $("geminiApiKey").value = "";
  $("geminiApiKey").placeholder = state.config.hasGeminiKey
    ? "저장됨 · 바꾸려면 새 키 입력"
    : "AIza… (메인 내용 보충·사이트마다 다른 카피)";
  if (state.drafts[0]) fillForm(state.drafts[0]);
  else $("siteTheme").value = "random";
  renderSites();
  if (!state.config.hasToken) {
    $("settings-status").textContent = "토큰이 없습니다. 기존 스튜디오 설정을 가져오거나 토큰을 저장하세요.";
  } else if (!state.config.hasGeminiKey) {
    $("settings-status").textContent = "제미나이 키가 없습니다. 계정 설정에 넣어야 사이트마다 메인 내용이 달라집니다.";
  }
}

boot().catch((err) => setStatus(err.message, true));
