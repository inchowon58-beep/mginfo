export type SiteIconSpec = {
  letters: string;
  bg: string;
  fg: string;
  accent: string;
  radius: number;
  mark: "block" | "circle" | "bar" | "split" | "dot";
};

const PALETTES: [string, string, string][] = [
  ["#1d4ed8", "#ffffff", "#93c5fd"],
  ["#0f766e", "#ecfdf5", "#5eead4"],
  ["#b45309", "#fffbeb", "#fbbf24"],
  ["#9f1239", "#fff1f2", "#fb7185"],
  ["#5b21b6", "#f5f3ff", "#c4b5fd"],
  ["#1e3a5f", "#e0f2fe", "#38bdf8"],
  ["#365314", "#ecfccb", "#a3e635"],
  ["#9a3412", "#ffedd5", "#fb923c"],
  ["#0e7490", "#cffafe", "#22d3ee"],
  ["#831843", "#fce7f3", "#f472b6"],
  ["#3f3f46", "#fafafa", "#a1a1aa"],
  ["#166534", "#dcfce7", "#4ade80"],
  ["#7c2d12", "#ffedd5", "#fdba74"],
  ["#1e40af", "#dbeafe", "#60a5fa"],
  ["#713f12", "#fef3c7", "#facc15"],
  ["#4c1d95", "#ede9fe", "#a78bfa"],
];

const MARKS: SiteIconSpec["mark"][] = ["block", "circle", "bar", "split", "dot"];

function hash32(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hostLabel(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

function lettersFrom(domain: string, name: string, hash: number) {
  const host = hostLabel(domain);
  const first = (host.split(".")[0] || "").replace(/[^a-z0-9]/gi, "");
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (first.length === 1) {
    const next = (host.split(".")[1] || "m")[0] || "M";
    return (first + next).toUpperCase();
  }
  const latin = String(name || "").replace(/[^a-z0-9]/gi, "");
  if (latin.length >= 2) return latin.slice(0, 2).toUpperCase();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${alphabet[hash % alphabet.length]}${alphabet[Math.floor(hash / 17) % alphabet.length]}`;
}

export function siteIconSeed() {
  return (
    String(process.env.SITE_ICON_SEED || "").trim() ||
    String(process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "").trim() ||
    String(process.env.SITE_NAME || "").trim() ||
    "magazine"
  );
}

export function getSiteIconSpec(seed = siteIconSeed()): SiteIconSpec {
  const hash = hash32(seed.toLowerCase());
  const palette = PALETTES[hash % PALETTES.length];
  const domain = String(process.env.SITE_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || seed);
  const name = String(process.env.SITE_NAME || "");
  return {
    letters: lettersFrom(domain, name, hash),
    bg: palette[0],
    fg: palette[1],
    accent: palette[2],
    radius: [6, 8, 10, 16][hash % 4],
    mark: MARKS[Math.floor(hash / 7) % MARKS.length],
  };
}

export function siteIconSvg(size = 32, seed = siteIconSeed()) {
  const spec = getSiteIconSpec(seed);
  const radius = spec.mark === "circle" ? size / 2 : (spec.radius / 32) * size;
  const fontSize = Math.round(size * (spec.letters.length > 1 ? 0.42 : 0.5));
  const inset = Math.max(3, Math.round(size * 0.12));
  const barW = Math.max(3, Math.round(size * 0.1));
  const dot = Math.max(5, Math.round(size * 0.18));
  const extras =
    spec.mark === "split"
      ? `<rect x="0" y="0" width="${size * 0.58}" height="${size}" fill="${spec.bg}"/>`
      : spec.mark === "bar"
        ? `<rect x="${inset}" y="${inset}" width="${barW}" height="${size - inset * 2}" rx="${barW}" fill="${spec.accent}"/>`
        : spec.mark === "dot"
          ? `<circle cx="${size - inset - dot / 2}" cy="${inset + dot / 2}" r="${dot / 2}" fill="${spec.accent}"/>`
          : "";
  const bg = spec.mark === "split" ? spec.accent : spec.bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  ${extras}
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" font-family="Arial,sans-serif" font-weight="700" fill="${spec.fg}">${spec.letters}</text>
</svg>`;
}

export function siteIconResponse(size = 32) {
  return new Response(siteIconSvg(size), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
