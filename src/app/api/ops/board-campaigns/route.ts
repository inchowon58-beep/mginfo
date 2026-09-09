import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import {
  appendCampaignKeywords,
  consentedSites,
  hubCampaignStats,
  parseHubCampaign,
  parseKeywordList,
  planHubCampaign,
} from "@/lib/hub-board";
import { getHubCampaigns, publishHubKeyword, upsertHubCampaign } from "@/lib/hub-board-store";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";
import { uid } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorize(request: Request) {
  if (await isMasterSession()) return true;
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

function campaignPayload(campaign: ReturnType<typeof parseHubCampaign>) {
  if (!campaign) return null;
  return { ...campaign, stats: hubCampaignStats(campaign) };
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  const [campaigns, sites] = await Promise.all([getHubCampaigns(), getOpsSites()]);
  return NextResponse.json({
    campaigns: campaigns.map((row) => campaignPayload(row)),
    sites: consentedSites(sites).map((site) => ({
      id: site.id,
      siteName: site.siteName,
      domain: site.domain,
      apexDomain: site.apexDomain,
      concept: site.concept,
    })),
  });
}

export async function PUT(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 저장할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const current = (await getHubCampaigns()).find((row) => row.id === String(body.id || ""));
  let campaign = parseHubCampaign(
    {
      ...body,
      id: String(body.id || current?.id || uid()),
      schedule: {
        enabled: Boolean((body.schedule as { enabled?: boolean } | undefined)?.enabled),
        startHour: Number((body.schedule as { startHour?: number } | undefined)?.startHour || 1),
        endHour: 23,
        planDate: current?.schedule.planDate || "",
      },
    },
    current
  );
  if (!campaign) return NextResponse.json({ error: "캠페인을 만들지 못했습니다." }, { status: 400 });
  if (!campaign.siteIds.length) return NextResponse.json({ error: "발행할 사이트를 선택하세요." }, { status: 400 });
  const text = String(body.text || "");
  if (text.trim()) {
    campaign = appendCampaignKeywords(campaign, parseKeywordList(text)).campaign;
  }
  try {
    const sites = await getOpsSites();
    const planned = planHubCampaign({ ...campaign, updatedAt: new Date().toISOString() }, sites);
    const list = await upsertHubCampaign(planned.campaign);
    const saved = list.find((row) => row.id === campaign.id) || planned.campaign;
    return NextResponse.json({ ok: true, campaign: campaignPayload(saved), planned: planned.planned });
  } catch (err) {
    return persistFail(err);
  }
}

export async function POST(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 발행할 수 있습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { campaignId?: string; keywordId?: string };
  const campaignId = String(body.campaignId || "").trim();
  const keywordId = String(body.keywordId || "").trim();
  if (!campaignId || !keywordId) {
    return NextResponse.json({ error: "발행할 키워드를 선택하세요." }, { status: 400 });
  }
  try {
    const result = await publishHubKeyword(campaignId, keywordId);
    if (!result.ok || !("campaign" in result) || !result.campaign) {
      return NextResponse.json({ error: result.error || "발행 실패" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      keyword: result.keyword,
      domain: result.domain,
      campaign: campaignPayload(result.campaign),
    });
  } catch (err) {
    return persistFail(err);
  }
}
