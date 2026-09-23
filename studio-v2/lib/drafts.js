const path = require("path");
const fs = require("fs");

function draftsPath(userData) {
  return path.join(userData, "brand-studio-drafts.json");
}

function readDrafts(userData) {
  try {
    const raw = JSON.parse(fs.readFileSync(draftsPath(userData), "utf8"));
    return Array.isArray(raw?.drafts) ? raw.drafts : [];
  } catch {
    return [];
  }
}

function writeDrafts(userData, drafts) {
  fs.writeFileSync(draftsPath(userData), JSON.stringify({ drafts }, null, 2), "utf8");
}

function uid() {
  return `bd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function previewHost(keyword, apexDomain) {
  const apex = String(apexDomain || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const label = String(keyword || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.+/g, "");
  if (!apex || !label) return { host: "", punycode: "" };
  const host = `${label}.${apex}`;
  let punycode = host;
  try {
    punycode = new URL(`https://${host}`).hostname;
  } catch {
    punycode = host;
  }
  return { host, punycode };
}

module.exports = {
  readDrafts,
  writeDrafts,
  uid,
  previewHost,
};
