import { parseKeywordList } from "./bulk-keywords";
import { resolveArticleStyle } from "./article-style";
import { ensureCategorySlug, getCategory } from "./categories";
import { generateArticle } from "./gemini";
import { DEFAULT_GEMINI_MODEL } from "./gemini-models";
import { resolveGeminiNotes } from "./gemini-notes";
import { notifyPostIndexed } from "./indexnow";
import { checkCanCreatePost, checkCanPublish, countPostsCreatedToday, seoulDateKey } from "./publish-limits";
import { extractPlaceName, parseNameList } from "./region-geo";
import { cleanHtml } from "./sanitize";
import { articleSlug, uid } from "./slug";
import { mergeImageUrls, pickRandomPostImages } from "./image-pool";
import { parseVendorFields } from "./vendor";
import type {
  BulkGroup,
  BulkKeyword,
  BulkPublishState,
  BulkSchedule,
  Category,
  Post,
  Store,
} from "./types";

export { parseKeywordList } from "./bulk-keywords";

export const DEFAULT_BULK_SCHEDULE: BulkSchedule = {
  enabled: false,
  startHour: 1,
  endHour: 23,
  planDate: "",
};

export function defaultBulkPublish(): BulkPublishState {
  return { schedule: { ...DEFAULT_BULK_SCHEDULE }, groups: [] };
}

export function normalizeBulkPublish(value?: Partial<BulkPublishState> | null): BulkPublishState {
  const schedule = { ...DEFAULT_BULK_SCHEDULE, ...(value?.schedule || {}) };
  schedule.startHour = clampHour(schedule.startHour, 1);
  schedule.endHour = clampHour(schedule.endHour, 23);
  if (schedule.endHour <= schedule.startHour) schedule.endHour = 23;
  schedule.planDate = String(schedule.planDate || "");
  const groups = Array.isArray(value?.groups) ? value.groups.map(normalizeGroup).filter(Boolean) as BulkGroup[] : [];
  return { schedule, groups };
}

function clampHour(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(23, Math.max(0, Math.floor(num)));
}

function normalizeGroup(raw: Partial<BulkGroup>): BulkGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
        .map((item) => {
          const keyword = String(item?.keyword || "").trim();
          if (!keyword) return null;
          return {
            id: String(item.id || uid()),
            keyword,
            status: item.status || "queued",
            postId: item.postId,
            scheduledAt: item.scheduledAt,
            publishedAt: item.publishedAt,
            error: item.error,
          } as BulkKeyword;
        })
        .filter((item): item is BulkKeyword => Boolean(item))
    : [];
  const vendor = parseVendorFields(raw as Record<string, unknown>);
  const max = Math.max(1, Math.min(7, Math.floor(Number(raw.imageCountMax ?? raw.imageCount) || 3)));
  const min = Math.max(1, Math.min(max, Math.floor(Number(raw.imageCountMin) || 1)));
  return {
    id: String(raw.id || uid()),
    category: String(raw.category || "life"),
    dailyLimit: Math.max(1, Math.min(40, Math.floor(Number(raw.dailyLimit) || 1))),
    vendorName: vendor.vendorName,
    vendorPhone: vendor.vendorPhone,
    vendorWebsite: vendor.vendorWebsite,
    vendorKakao: vendor.vendorKakao,
    writingStyle: String(raw.writingStyle || "random").trim() || "random",
    imagePool: mergeImageUrls([], Array.isArray(raw.imagePool) ? raw.imagePool.map((item) => String(item || "")) : []),
    imageCountMin: min,
    imageCountMax: max,
    keywords,
  };
}

export function appendKeywords(group: BulkGroup, incoming: string[]): { group: BulkGroup; added: number } {
  const have = new Set(group.keywords.map((item) => item.keyword));
  const extra: BulkKeyword[] = [];
  for (const keyword of incoming) {
    if (have.has(keyword)) continue;
    have.add(keyword);
    extra.push({ id: uid(), keyword, status: "queued" });
  }
  return { group: { ...group, keywords: [...group.keywords, ...extra] }, added: extra.length };
}

function padHour(hour: number) {
  return String(hour).padStart(2, "0");
}

export function seoulWindow(dateKey: string, startHour: number, endHour: number) {
  return {
    start: new Date(`${dateKey}T${padHour(startHour)}:00:00+09:00`),
    end: new Date(`${dateKey}T${padHour(endHour)}:00:00+09:00`),
  };
}

export function randomPublishSlots(count: number, start: Date, end: Date): Date[] {
  if (count <= 0) return [];
  const startMs = start.getTime();
  const endMs = Math.max(startMs + 60_000, end.getTime());
  const span = endMs - startMs;
  const minGap = Math.min(18 * 60_000, Math.max(6 * 60_000, Math.floor(span / (count + 2))));
  const slots: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = new Date(startMs + Math.floor(Math.random() * span));
    slots.push(raw);
  }
  slots.sort((a, b) => a.getTime() - b.getTime());
  for (let i = 1; i < slots.length; i += 1) {
    const minTime = slots[i - 1].getTime() + minGap + Math.floor(Math.random() * 7 * 60_000);
    if (slots[i].getTime() < minTime) {
      slots[i] = new Date(Math.min(endMs, minTime));
    }
  }
  return slots;
}

function openKeywords(group: BulkGroup) {
  return group.keywords.filter((item) => item.status === "queued" || item.status === "scheduled");
}

export function planToday(store: Store, now = new Date()) {
  const state = store.bulkPublish;
  const today = seoulDateKey(now);
  if (!today || !state.schedule.enabled) return { planned: 0, reason: "off" as const };
  if (state.schedule.planDate === today) return { planned: 0, reason: "already" as const };

  const { start, end } = seoulWindow(today, state.schedule.startHour, state.schedule.endHour);
  if (now >= end) {
    state.schedule.planDate = today;
    return { planned: 0, reason: "closed" as const };
  }
  const windowStart = now > start ? now : start;
  const masterLimit = Number(store.settings.dailyPostLimit) || 0;
  const used = countPostsCreatedToday(store.posts);
  let remaining = masterLimit > 0 ? Math.max(0, masterLimit - used) : 999;

  const picks: BulkKeyword[] = [];
  for (const group of state.groups) {
    if (remaining <= 0) break;
    const take = Math.min(group.dailyLimit, remaining, group.keywords.filter((item) => item.status === "queued").length);
    const queued = group.keywords.filter((item) => item.status === "queued").slice(0, take);
    picks.push(...queued);
    remaining -= queued.length;
  }

  const slots = randomPublishSlots(picks.length, windowStart, end);
  picks.forEach((item, index) => {
    item.status = "scheduled";
    item.scheduledAt = slots[index].toISOString();
    item.error = undefined;
  });
  state.schedule.planDate = today;
  return { planned: picks.length, reason: "ok" as const };
}

export function dueKeywords(store: Store, now = new Date()) {
  const due: { group: BulkGroup; keyword: BulkKeyword }[] = [];
  for (const group of store.bulkPublish.groups) {
    for (const keyword of group.keywords) {
      if (keyword.status !== "scheduled") continue;
      if (!keyword.scheduledAt || new Date(keyword.scheduledAt).getTime() > now.getTime()) continue;
      due.push({ group, keyword });
    }
  }
  due.sort((a, b) => String(a.keyword.scheduledAt).localeCompare(String(b.keyword.scheduledAt)));
  return due;
}

export function bulkStats(state: BulkPublishState, categories: Category[] = []) {
  const all = state.groups.flatMap((group) => group.keywords);
  const published = all.filter((item) => item.status === "published").length;
  const failed = all.filter((item) => item.status === "failed").length;
  const queued = all.filter((item) => item.status === "queued").length;
  const scheduled = all.filter((item) => item.status === "scheduled" || item.status === "processing").length;
  const total = all.length;
  const remaining = queued + scheduled;
  const today = seoulDateKey();
  const todayScheduled = all.filter((item) => item.scheduledAt && seoulDateKey(item.scheduledAt) === today).length;
  const todayPublished = all.filter((item) => item.publishedAt && seoulDateKey(item.publishedAt) === today).length;
  const dailyCapacity = state.groups.reduce((sum, group) => {
    const left = openKeywords(group).length;
    return sum + Math.min(group.dailyLimit, left);
  }, 0);
  let daysLeft = 0;
  const leftPerGroup = state.groups.map((group) => openKeywords(group).length);
  while (leftPerGroup.some((n) => n > 0) && daysLeft < 4000) {
    daysLeft += 1;
    for (let i = 0; i < leftPerGroup.length; i += 1) {
      leftPerGroup[i] = Math.max(0, leftPerGroup[i] - state.groups[i].dailyLimit);
    }
  }
  const groups = state.groups.map((group) => {
    const cat = getCategory(group.category, categories);
    const done = group.keywords.filter((item) => item.status === "published").length;
    const left = openKeywords(group).length;
    return {
      id: group.id,
      category: group.category,
      name: cat?.name || group.category,
      vendorName: group.vendorName || "",
      dailyLimit: group.dailyLimit,
      total: group.keywords.length,
      done,
      failed: group.keywords.filter((item) => item.status === "failed").length,
      remaining: left,
      percent: group.keywords.length ? Math.round((done / group.keywords.length) * 100) : 0,
    };
  });
  return {
    total,
    published,
    failed,
    queued,
    scheduled,
    remaining,
    percent: total ? Math.round((published / total) * 100) : 0,
    daysLeft,
    dailyCapacity,
    todayScheduled,
    todayPublished,
    enabled: state.schedule.enabled,
    startHour: state.schedule.startHour,
    endHour: state.schedule.endHour,
    planDate: state.schedule.planDate,
    groups,
  };
}

const MAX_PER_TICK = 4;

export async function publishDueBulk(store: Store, opts: { mutator: typeof import("./db").updateStore }) {
  const createBlock = checkCanCreatePost(store.settings, store.posts);
  if (createBlock) return { processed: 0, results: [], error: createBlock };
  const publishBlock = checkCanPublish(store.settings);
  if (publishBlock) return { processed: 0, results: [], error: publishBlock };

  const due = dueKeywords(store).slice(0, MAX_PER_TICK);
  const results: { keyword: string; ok: boolean; error?: string }[] = [];

  for (const item of due) {
    const limitBlock = checkCanCreatePost(store.settings, store.posts);
    if (limitBlock) {
      results.push({ keyword: item.keyword.keyword, ok: false, error: limitBlock });
      break;
    }
    await opts.mutator((s) => {
      const found = findKeyword(s, item.keyword.id);
      if (found) found.keyword.status = "processing";
    });
    try {
      const post = await generateAndSave(store, item.group, item.keyword);
      store.posts.unshift(post);
      await opts.mutator((s) => {
        if (!s.posts.some((row) => row.id === post.id)) s.posts.unshift(post);
        const found = findKeyword(s, item.keyword.id);
        if (found) {
          found.keyword.status = "published";
          found.keyword.postId = post.id;
          found.keyword.publishedAt = post.publishedAt || new Date().toISOString();
          found.keyword.error = undefined;
        }
      });
      await notifyPostIndexed(post.slug);
      results.push({ keyword: item.keyword.keyword, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "발행 실패";
      await opts.mutator((s) => {
        const found = findKeyword(s, item.keyword.id);
        if (found) {
          found.keyword.status = "failed";
          found.keyword.error = message;
        }
      });
      results.push({ keyword: item.keyword.keyword, ok: false, error: message });
    }
  }
  return { processed: results.length, results };
}

export async function publishBulkKeyword(
  store: Store,
  keywordId: string,
  opts: { mutator: typeof import("./db").updateStore }
) {
  const found = findKeyword(store, keywordId);
  if (!found) return { ok: false, error: "키워드를 찾을 수 없습니다." };
  if (found.keyword.status === "published") return { ok: false, error: "이미 발행된 키워드입니다." };
  if (found.keyword.status === "processing") return { ok: false, error: "이미 작성 중입니다." };
  const createBlock = checkCanCreatePost(store.settings, store.posts);
  if (createBlock) return { ok: false, error: createBlock };
  const publishBlock = checkCanPublish(store.settings);
  if (publishBlock) return { ok: false, error: publishBlock };

  await opts.mutator((s) => {
    const row = findKeyword(s, keywordId);
    if (!row) return;
    row.keyword.status = "processing";
  });
  try {
    const post = await generateAndSave(store, found.group, found.keyword);
    store.posts.unshift(post);
    await opts.mutator((s) => {
      if (!s.posts.some((row) => row.id === post.id)) s.posts.unshift(post);
      const row = findKeyword(s, keywordId);
      if (row) {
        row.keyword.status = "published";
        row.keyword.postId = post.id;
        row.keyword.publishedAt = post.publishedAt || new Date().toISOString();
        row.keyword.error = undefined;
      }
    });
    await notifyPostIndexed(post.slug);
    return { ok: true, keyword: found.keyword.keyword };
  } catch (err) {
    const message = err instanceof Error ? err.message : "발행 실패";
    await opts.mutator((s) => {
      const row = findKeyword(s, keywordId);
      if (row) {
        row.keyword.status = "failed";
        row.keyword.error = message;
      }
    });
    return { ok: false, keyword: found.keyword.keyword, error: message };
  }
}

function findKeyword(store: Store, id: string) {
  for (const group of store.bulkPublish.groups) {
    const keyword = group.keywords.find((item) => item.id === id);
    if (keyword) return { group, keyword };
  }
  return null;
}

async function generateAndSave(store: Store, group: BulkGroup, item: BulkKeyword): Promise<Post> {
  const cats = store.categories || [];
  const category = ensureCategorySlug(group.category, cats);
  const cat = getCategory(category, cats);
  const apiKey = store.settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("제미나이 API 키가 없습니다.");
  const writingStyle = resolveArticleStyle(group.writingStyle || "random", item.keyword);
  const article = await generateArticle({
    topic: item.keyword,
    writingStyle,
    category,
    categoryName: cat?.name,
    notes: resolveGeminiNotes("", cat?.geminiNotes),
    focusKeyword: item.keyword,
    region: extractPlaceName(item.keyword) || "",
    vendorName: group.vendorName,
    apiKey,
    model: store.settings.geminiModel || DEFAULT_GEMINI_MODEL,
  });
  const now = new Date().toISOString();
  let slug = articleSlug(article.slugHint, item.keyword);
  if (store.posts.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const photos = pickRandomPostImages(group.imagePool || [], group.imageCountMin || 1, group.imageCountMax || 3);
  return {
    id: uid(),
    slug,
    title: article.title,
    excerpt: article.excerpt || "",
    bodyHtml: cleanHtml(article.bodyHtml || ""),
    category,
    tags: article.tags || [],
    coverImage: photos.cover,
    extraImages: photos.extras,
    focusKeyword: item.keyword,
    faqItems: article.faqItems,
    regionInfo: article.regionInfo,
    nearbyAreas: parseNameList(article.nearbyAreas),
    nearbyStations: parseNameList(article.nearbyStations),
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    theme: "art-blog",
    region: extractPlaceName(article.title, item.keyword) || undefined,
    vendorName: group.vendorName,
    vendorPhone: group.vendorPhone,
    vendorWebsite: group.vendorWebsite,
    vendorKakao: group.vendorKakao,
  };
}

export function sanitizeGroupsInput(raw: unknown, categories: Category[]): BulkGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Partial<BulkGroup> & { text?: string };
      const group = normalizeGroup({
        ...item,
        category: ensureCategorySlug(item.category, categories),
        keywords: item.keywords,
      });
      if (!group) return null;
      if (typeof item.text === "string" && item.text.trim()) {
        return appendKeywords(group, parseKeywordList(item.text)).group;
      }
      return group;
    })
    .filter((item): item is BulkGroup => Boolean(item));
}

export function sanitizeScheduleInput(raw: unknown, prev: BulkSchedule): BulkSchedule {
  const body = raw && typeof raw === "object" ? (raw as Partial<BulkSchedule>) : {};
  return normalizeBulkPublish({
    schedule: {
      ...prev,
      enabled: typeof body.enabled === "boolean" ? body.enabled : prev.enabled,
      startHour: body.startHour ?? prev.startHour,
      endHour: body.endHour ?? prev.endHour,
      planDate: prev.planDate,
    },
    groups: [],
  }).schedule;
}
