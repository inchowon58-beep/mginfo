export function slugify(input: string): string {
  const koreanSafe = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return koreanSafe || `post-${Date.now()}`;
}

export function decodeSlugParam(slug: string): string {
  let value = String(slug || "").trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      if (!/%[0-9A-Fa-f]{2}/.test(value)) break;
      const next = decodeURIComponent(value);
      if (next === value) break;
      value = next;
    } catch {
      break;
    }
  }
  return value.normalize("NFC");
}

export function isAsciiSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function articleSlug(hint?: string, fallback?: string): string {
  for (const raw of [hint, fallback]) {
    const slug = slugify(String(raw || ""));
    if (slug && isAsciiSlug(slug)) return slug.slice(0, 80);
  }
  return `post-${Date.now().toString(36)}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
