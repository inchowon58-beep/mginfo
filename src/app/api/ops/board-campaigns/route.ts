import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { getHubCampaigns, upsertHubCampaign } from "@/lib/hub-board-store";
import { consentedSites, parseHubCampaign, pushCampaignToSites } from "@/lib/hub-board";
import { persistFail } from "@/lib/persist-api";
import { uid } from "@/lib/slug";
import { cleanHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorize(request: Request) {
  if (await isMasterSession()) return true;
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  const [campaigns, sites] = await Promise.all([getHubCampaigns(), getOpsSites()]);
  return NextResponse.json({
    campaigns,
    sites: consentedSites(sites).map((site) => ({
      id: site.id,
      siteName: site.siteName,
      domain: site.domain,
      apexDomain: site.apexDomain,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 등록할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  const siteIds = Array.isArray(body.siteIds) ? body.siteIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  if (!siteIds.length) return NextResponse.json({ error: "발행할 사이트를 선택하세요." }, { status: 400 });

  const now = new Date().toISOString();
  const scheduledAt = String(body.scheduledAt || "").trim();
  const publishNow = Boolean(body.publishNow) || !scheduledAt;
  let campaign = parseHubCampaign({
    id: uid(),
    title,
    excerpt: String(body.excerpt || ""),
    bodyHtml: cleanHtml(String(body.bodyHtml || "")),
    coverImage: String(body.coverImage || ""),
    vendorName: body.vendorName,
    vendorPhone: body.vendorPhone,
    vendorWebsite: body.vendorWebsite,
    vendorKakao: body.vendorKakao,
    siteIds,
    status: "scheduled",
    scheduledAt: publishNow ? now : scheduledAt,
    createdAt: now,
    updatedAt: now,
    results: [],
  });
  if (!campaign) return NextResponse.json({ error: "캠페인을 만들지 못했습니다." }, { status: 400 });

  try {
    if (publishNow) {
      const sites = await getOpsSites();
      campaign = await pushCampaignToSites(campaign, sites);
    }
    await upsertHubCampaign(campaign);
    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    return persistFail(err);
  }
}
