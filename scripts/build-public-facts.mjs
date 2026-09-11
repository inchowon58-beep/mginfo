/**
 * OFFLINE / CI ONLY.
 * Fetches data.go.kr snapshots and writes src/lib/public-facts-data.ts
 * Never import this from a Next.js request handler — live portal calls on Vercel
 * burn quota and function time across every clone.
 *
 * Usage: node --env-file=.env.local scripts/build-public-facts.mjs
 * Probe: node --env-file=.env.local scripts/build-public-facts.mjs --probe
 *
 * data.go.kr datasets to apply for (업종별):
 *   - 동물병원 인허가          MOI path: animal_hospitals          (loaded)
 *   - 동물미용업 인허가        MOI path: pet_grooming             (loaded)
 *   - 일반음식점 인허가        MOI path: general_restaurants      (loaded)
 *   - 관광숙박업 인허가        MOI path: tourist_accommodations   (loaded)
 *   - 미용업 인허가            MOI path: beauty_salons            (probe only; add to main after 승인)
 *   - 동물판매업 인허가        MOI path: confirm after 활용신청    (do not guess on every request)
 *   - 동물생산업 인허가        MOI path: confirm after 활용신청
 *   - 동물위탁관리업 인허가    MOI path: confirm after 활용신청
 *   - 유기동물/보호센터        abandonmentPublicService_v2 / animalShelterSrvc_v2
 *   - 관광지                   KorService2 areaBasedList2
 *
 * See docs/public-data.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvKey() {
  if (process.env.DATA_GO_KR_KEY) return String(process.env.DATA_GO_KR_KEY).trim();
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return "";
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split(/\r?\n/).find((row) => row.startsWith("DATA_GO_KR_KEY="));
  return line ? line.slice("DATA_GO_KR_KEY=".length).trim().replace(/^["']|["']$/g, "") : "";
}

const KEY = loadEnvKey();
if (!KEY) {
  console.error("DATA_GO_KR_KEY is missing. Put it in .env.local");
  process.exit(1);
}

const ENC = encodeURIComponent(KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

async function getJson(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i += 1) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    const limited = res.status === 429 || /LIMITED_NUMBER|SERVICE EXCEED|초당 호출/.test(text);
    if (limited) {
      await sleep(1600 * (i + 1));
      continue;
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = text.slice(0, 200);
      lastErr = err;
      if (res.status === 403) throw err;
      await sleep(400);
      continue;
    }
    if (text.trim().startsWith("<")) {
      const err = new Error("xml");
      err.status = res.status;
      err.body = text.slice(0, 200);
      throw err;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const err = new Error("not-json");
      err.body = text.slice(0, 200);
      throw err;
    }
    const errCode = String(data?.cmmMsgHeader?.returnReasonCode || "");
    if (errCode) {
      if (errCode === "22" || errCode === "23") {
        await sleep(1600 * (i + 1));
        continue;
      }
      const err = new Error(data?.cmmMsgHeader?.errMsg || errCode);
      err.status = errCode === "20" || errCode === "30" ? 403 : 400;
      throw err;
    }
    const code = String(data?.response?.header?.resultCode || "");
    if (code && !["00", "0000", "0"].includes(code)) {
      if (code === "22" || code === "23") {
        await sleep(1600 * (i + 1));
        continue;
      }
      const err = new Error(data?.response?.header?.resultMsg || code);
      err.status = code === "20" ? 403 : 400;
      err.body = text.slice(0, 200);
      throw err;
    }
    return data;
  }
  throw lastErr || new Error("retry-exhausted");
}

function serviceBlock(data) {
  if (!data || typeof data !== "object") return null;
  if (data.response) return null;
  return (
    Object.values(data).find((value) => value && typeof value === "object" && (value.head || value.row)) || null
  );
}

function itemsOf(data) {
  const body = data?.response?.body || {};
  const raw = body.items?.item ?? body.items ?? [];
  if (Array.isArray(raw) && raw.length) return raw;
  if (raw && !Array.isArray(raw)) return [raw];
  const rows = serviceBlock(data)?.row;
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}

function totalOf(data) {
  const body = data?.response?.body || {};
  if (body.totalCount != null && body.totalCount !== "") {
    const n = Number(body.totalCount);
    if (Number.isFinite(n)) return n;
  }
  const heads = serviceBlock(data)?.head;
  const list = Array.isArray(heads) ? heads : heads ? [heads] : [];
  for (const head of list) {
    if (head?.list_total_count != null) {
      const n = Number(head.list_total_count);
      if (Number.isFinite(n)) return n;
    }
  }
  return itemsOf(data).length;
}

function addrOf(row) {
  return String(row.LOTNO_ADDR || row.ROAD_NM_ADDR || row.LOCPLC_ADDR || row.REFINE_LOTNO_ADDR || row.careAddr || "").trim();
}

const catalog = fs.readFileSync(path.join(ROOT, "src/lib/region-catalog.ts"), "utf8");
const officials = [
  ...new Set([...catalog.matchAll(/"official":\s*"([^"]+)"/g)].map((m) => m[1])),
].sort((a, b) => b.length - a.length);

const citiesSrc = fs.readFileSync(path.join(ROOT, "scripts/build-region-catalog.mjs"), "utf8");
const SIDO_ONLY = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
]);

const queryOfficials = [
  ...new Set([...citiesSrc.matchAll(/\["[^"]+",\s*"([^"]+)",\s*[\d.]+,\s*[\d.]+,/g)].map((m) => m[1])),
].filter((name) => !SIDO_ONLY.has(name) && /(시|군|구)$/.test(name));
const queryOfficialsSorted = [...queryOfficials].sort((a, b) => b.length - a.length);

function compactPlace(value) {
  return String(value || "")
    .replace(/특별자치시|특별자치도|특별시|광역시|자치시|자치도/g, "")
    .replace(/도(?=\s)/, "")
    .replace(/\s+/g, "");
}

function matchQueryOfficial(addr) {
  if (!addr) return "";
  const direct = queryOfficialsSorted.find((name) => addr.includes(name));
  if (direct) return direct;
  const compact = compactPlace(addr);
  return queryOfficialsSorted.find((name) => compact.includes(compactPlace(name))) || "";
}

function ensure(map, official) {
  if (!map[official]) {
    map[official] = {
      official,
      restaurants: 0,
      vets: 0,
      groomers: 0,
      salons: 0,
      stays: 0,
      shelters: 0,
      rescueDogs90: 0,
      tourSpots: 0,
    };
  }
  return map[official];
}

const facts = {};
const errors = [];
const moiKind = {};

const MOI_KINDS = {
  lotnoOpen: [
    ["cond[LOTNO_ADDR::LIKE]", "OFFICIAL"],
    ["cond[SALS_STTS_CD::EQ]", "01"],
  ],
  lotno: [["cond[LOTNO_ADDR::LIKE]", "OFFICIAL"]],
  road: [["cond[ROAD_NM_ADDR::LIKE]", "OFFICIAL"]],
};

function moiExtras(kind, official) {
  return MOI_KINDS[kind].map(([k, v]) => [k, v === "OFFICIAL" ? official : v]);
}

async function moiCount(pathName, field, official) {
  const kinds = moiKind[pathName] ? [moiKind[pathName]] : ["lotnoOpen", "lotno", "road"];
  let last = 0;
  for (const kind of kinds) {
    const params = new URLSearchParams({
      serviceKey: KEY,
      pageNo: "1",
      numOfRows: "1",
      returnType: "json",
    });
    for (const [k, v] of moiExtras(kind, official)) params.append(k, v);
    await sleep(40);
    const data = await getJson(`https://apis.data.go.kr/1741000/${pathName}/info?${params.toString()}`);
    const n = totalOf(data);
    last = n;
    if (n > 0 && n < 80000) {
      moiKind[pathName] = kind;
      ensure(facts, official)[field] = n;
      return n;
    }
  }
  return last >= 80000 ? 0 : last;
}

async function paginateAnimal(urlBase, pageSize = 100) {
  const all = [];
  let page = 1;
  let total = Infinity;
  while ((page - 1) * pageSize < total && page < 80) {
    await sleep(80);
    const url = `${urlBase}&numOfRows=${pageSize}&pageNo=${page}&_type=json`;
    const data = await getJson(url);
    const rows = itemsOf(data);
    const headerOk = data?.response?.header?.resultCode === "00" || data?.response?.header?.resultCode === "0000";
    if (!headerOk && !rows.length) break;
    total = Number(data?.response?.body?.totalCount || total);
    all.push(...rows);
    if (!rows.length) break;
    page += 1;
  }
  return all;
}

async function loadShelters() {
  console.log("shelters…");
  const rows = await paginateAnimal(
    `https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2?serviceKey=${ENC}`
  );
  for (const row of rows) {
    const official = matchQueryOfficial(addrOf(row) || String(row.orgNm || ""));
    if (!official) continue;
    ensure(facts, official).shelters += 1;
  }
  console.log("shelters", rows.length);
}

async function loadSigunguCodes() {
  const sido = await getJson(
    `https://apis.data.go.kr/1543061/abandonmentPublicService_v2/sido_v2?serviceKey=${ENC}&numOfRows=30&pageNo=1&_type=json`
  );
  const list = [];
  for (const s of itemsOf(sido)) {
    await sleep(80);
    const sub = await getJson(
      `https://apis.data.go.kr/1543061/abandonmentPublicService_v2/sigungu_v2?serviceKey=${ENC}&upr_cd=${s.orgCd}&numOfRows=80&pageNo=1&_type=json`
    );
    for (const g of itemsOf(sub)) {
      list.push({
        upr: s.orgCd,
        org: g.orgCd,
        name: `${s.orgdownNm} ${g.orgdownNm}`.replace(/\s+/g, " ").trim(),
      });
    }
  }
  return list;
}

async function loadRescue(sigungu) {
  console.log("rescue counts…", sigungu.length);
  const bgnde = daysAgo(90);
  const ended = ymd(new Date());
  for (const row of sigungu) {
    await sleep(80);
    try {
      const url = `https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2?serviceKey=${ENC}&bgnde=${bgnde}&ended=${ended}&upkind=417000&upr_cd=${row.upr}&org_cd=${row.org}&pageNo=1&numOfRows=1&_type=json`;
      const data = await getJson(url);
      const n = Number(data?.response?.body?.totalCount || 0);
      const hit = matchQueryOfficial(row.name);
      if (hit && n) ensure(facts, hit).rescueDogs90 += n;
    } catch (err) {
      errors.push(`rescue ${row.name}: ${err.message}`);
    }
  }
}

async function mapPool(items, limit, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => run()));
}

async function loadMoi(pathName, field, label) {
  console.log(label, "…", queryOfficials.length);
  let ok = 0;
  let forbidden = false;
  await mapPool(queryOfficials, 3, async (official, index) => {
    if (forbidden) return;
    if (index % 50 === 0) console.log(label, index + 1, "/", queryOfficials.length);
    try {
      const n = await moiCount(pathName, field, official);
      if (n) ok += 1;
    } catch (err) {
      errors.push(`${label} ${official}: ${err.status || ""} ${err.message}`);
      if (err.status === 403) {
        forbidden = true;
        console.log(label, "forbidden — skip rest");
      }
    }
  });
  console.log(label, "hit", ok);
}

async function loadTour() {
  console.log("tour…");
  const area = await getJson(
    `https://apis.data.go.kr/B551011/KorService2/areaCode2?serviceKey=${ENC}&numOfRows=20&pageNo=1&MobileOS=ETC&MobileApp=infocs&_type=json`
  );
  const sidos = itemsOf(area);
  for (const s of sidos) {
    await sleep(80);
    const sub = await getJson(
      `https://apis.data.go.kr/B551011/KorService2/areaCode2?serviceKey=${ENC}&numOfRows=80&pageNo=1&MobileOS=ETC&MobileApp=infocs&_type=json&areaCode=${s.code}`
    );
    const gun = itemsOf(sub);
    const targets = gun.length ? gun.map((g) => ({ ...g, parent: s })) : [{ ...s, parent: null }];
    for (const g of targets) {
      await sleep(80);
      try {
        const url = `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?serviceKey=${ENC}&numOfRows=1&pageNo=1&MobileOS=ETC&MobileApp=infocs&_type=json&arrange=R&contentTypeId=12&areaCode=${s.code}${g.parent ? `&sigunguCode=${g.code}` : ""}`;
        const data = await getJson(url);
        const n = Number(data?.response?.body?.totalCount || 0);
        const label = g.parent ? `${s.name} ${g.name}` : s.name;
        const official = matchQueryOfficial(label);
        if (official && n) ensure(facts, official).tourSpots += n;
      } catch (err) {
        errors.push(`tour ${s.name}: ${err.message}`);
      }
    }
  }
}

async function probe() {
  const sample = queryOfficials.find((name) => name.includes("안양")) || queryOfficials[0];
  console.log("probe official", sample, "query", queryOfficials.length);
  for (const pathName of ["general_restaurants", "animal_hospitals", "pet_grooming", "beauty_salons", "tourist_accommodations"]) {
    try {
      const n = await moiCount(pathName, pathName, sample);
      console.log(pathName, n, moiKind[pathName] || "none");
    } catch (err) {
      console.log(pathName, err.status || "", err.message, err.body || "");
    }
  }
}

async function main() {
  if (process.argv.includes("--probe")) {
    await probe();
    return;
  }
  console.log("officials", officials.length, "query", queryOfficials.length);
  try {
    await loadShelters();
  } catch (err) {
    errors.push(`shelters: ${err.message}`);
  }
  try {
    const sigungu = await loadSigunguCodes();
    await loadRescue(sigungu);
  } catch (err) {
    errors.push(`sigungu: ${err.message}`);
  }
  await loadMoi("general_restaurants", "restaurants", "restaurants");
  await loadMoi("animal_hospitals", "vets", "vets");
  await loadMoi("pet_grooming", "groomers", "groomers");
  await loadMoi("tourist_accommodations", "stays", "stays");
  // beauty_salons / animal_sales / animal_production / animal_boarding:
  // add loadMoi(...) only after the portal path name is approved. Do not call from serverless.
  try {
    await loadTour();
  } catch (err) {
    errors.push(`tour: ${err.message}`);
  }

  const rows = Object.values(facts)
    .map((row) => {
      const slim = { official: row.official };
      for (const key of ["restaurants", "vets", "groomers", "salons", "stays", "shelters", "rescueDogs90", "tourSpots"]) {
        if (Number(row[key]) > 0) slim[key] = Number(row[key]);
      }
      return slim;
    })
    .filter((row) => Object.keys(row).length > 1)
    .sort((a, b) => a.official.localeCompare(b.official, "ko"));

  const out = `/* Generated by scripts/build-public-facts.mjs — ${today()} */
export type PublicFactRow = {
  official: string;
  restaurants?: number;
  vets?: number;
  groomers?: number;
  salons?: number;
  stays?: number;
  shelters?: number;
  rescueDogs90?: number;
  tourSpots?: number;
};

export const PUBLIC_FACTS_UPDATED = ${JSON.stringify(today())};

export const PUBLIC_FACTS: PublicFactRow[] = ${JSON.stringify(rows, null, 2)};
`;
  const dest = path.join(ROOT, "src/lib/public-facts-data.ts");
  fs.writeFileSync(dest, out, "utf8");
  console.log("wrote", dest, "rows", rows.length, "errors", errors.length);
  if (errors.length) console.log(errors.slice(0, 20).join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
