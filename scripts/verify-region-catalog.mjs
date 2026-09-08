import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = fs.readFileSync(path.join(root, "src", "lib", "region-catalog.ts"), "utf8");
const marker = "export const REGION_CATALOG: RegionCatalogRow[] = ";
const start = text.indexOf(marker);
const jsonStart = start + marker.length;
const end = text.indexOf("\nexport const REGION_CATALOG_KEY_COUNT", jsonStart);
const rows = JSON.parse(text.slice(jsonStart, end).replace(/;\s*$/, ""));
const keys = [...new Set(rows.flatMap((r) => r.keys))].sort((a, b) => b.length - a.length);

function extract(hay) {
  for (const key of keys) if (hay.includes(key)) return key;
  return "";
}

const tests = [
  ["시흥코카스파니엘분양", "시흥"],
  ["청라코카스파니엘분양", "청라"],
  ["부천코카스파니엘분양", "부천"],
  ["청라국제도시 분양", "청라국제도시"],
  ["남양주 분양", "남양주"],
  ["양주 분양", "양주"],
  ["송도 분양", "송도"],
  ["강남 분양", "강남"],
];

let fail = 0;
for (const [hay, expect] of tests) {
  const got = extract(hay);
  const ok = got === expect;
  if (!ok) fail += 1;
  console.log(ok ? "OK" : "FAIL", hay, "=>", got, "expected", expect);
}

const siheung = rows.find((r) => r.keys.includes("시흥"));
const cheongna = rows.find((r) => r.keys.includes("청라"));
const bucheon = rows.find((r) => r.keys.includes("부천"));
console.log("시흥", siheung?.official, siheung?.stations);
console.log("청라", cheongna?.official, cheongna?.nearby);
console.log("부천 catalog landmarks", bucheon?.landmarks);
console.log("keys", keys.length, "rows", rows.length);
if (keys.length < 777) process.exit(1);
if (fail) process.exit(1);
