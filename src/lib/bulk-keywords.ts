export function parseKeywordList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(text || "").split(/[\n\r,]+/)) {
    const keyword = part.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    out.push(keyword);
  }
  return out;
}
