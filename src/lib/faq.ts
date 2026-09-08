import type { FaqItem } from "./types";

export type { FaqItem };

export function parseFaqItems(raw: unknown): FaqItem[] | undefined {
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = String(row.question || "").trim().slice(0, 120);
      const answer = String(row.answer || "").trim().slice(0, 450);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is FaqItem => Boolean(item));
  return items.length ? items.slice(0, 5) : undefined;
}
