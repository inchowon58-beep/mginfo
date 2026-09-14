import { NextResponse } from "next/server";
import { checkMasterPassword, isMasterSession } from "@/lib/auth";
import {
  appendCampaignKeywords,
  consentedSites,
  hubCampaignStats,
  hubBoardTodaySummary,
  hubTodayProgress,
  parseHubCampaign,
  parseKeywordList,
  planHubCampaign,
  type HubBoardCampaign,
} from "@/lib/hub-board";
import { getHubCampaigns, publishHubKeyword, upsertHubCampaign } from "@/lib/hub-board-store";
import { isOpsHub } from "@/lib/ops-hub";
import { getOpsSites } from "@/lib/ops-store";
import { persistFail } from "@/lib/persist-api";
import { uid } from "@/lib/slug";
import type { OpsSite } from "@/lib/ops-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorize(request: Request) {
  if (await isMasterSession()) return true;
  return checkMasterPassword(request.headers.get("x-infocs-master") || "");
}

function campaignPayload(campaign: ReturnType<typeof parseHubCampaign>) {
  if (!campaign) return null;
  return { ...campaign, stats: hubCampaignStats(campaign), today: hubTodayProgress(campaign) };
}

async function saveCampaignBody(body: Record<string, unknown>, sites: OpsSite[]) {
  const current = (await getHubCampaigns()).find((row) => row.id === String(body.id || ""));
  let campaign = parseHubCampaign(
    {
      ...body,
      id: String(body.id || current?.id || uid()),
      schedule: {
        enabled:
          typeof (body.schedule as { enabled?: boolean } | undefined)?.enabled === "boolean"
            ? Boolean((body.schedule as { enabled?: boolean }).enabled)
            : Boolean(current?.schedule.enabled ?? true),
        startHour: Number((body.schedule as { startHour?: number } | undefined)?.startHour || current?.schedule.startHour || 9),
        endHour: 23,
        planDate: current?.schedule.planDate || "",
      },
    },
    current
  );
  if (!campaign) throw new Error("캠페인을 만들지 못했습니다.");
  if (!campaign.siteIds.length) throw new Error("발행할 사이트를 선택하세요.");
  const text = String(body.text || "");
  if (text.trim()) {
    campaign = appendCampaignKeywords(campaign, parseKeywordList(text)).campaign;
  }
  const planned = planHubCampaign({ ...campaign, updatedAt: new Date().toISOString() }, sites);
  const list = await upsertHubCampaign(planned.campaign);
  const saved = list.find((row) => row.id === campaign.id) || planned.campaign;
  return { campaign: saved, planned: planned.planned };
}

export async function GET(request: Request) {
  if (!(await isOpsHub())) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "마스터만 볼 수 있습니다." }, { status: 401 });
  }
  const [campaigns, sites] = await Promise.all([getHubCampaigns(), getOpsSites()]);
  return NextResponse.json({
    campaigns: campaigns.map((row) => campaignPayload(row)),
    today: hubBoardTodaySummary(campaigns),
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
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [body];
  if (!items.length) return NextResponse.json({ error: "저장할 광고가 없습니다." }, { status: 400 });
  try {
    const sites = await getOpsSites();
    const saved: HubBoardCampaign[] = [];
    let planned = 0;
    for (const item of items) {
      const result = await saveCampaignBody(item, sites);
      saved.push(result.campaign);
      planned += result.planned;
    }
    return NextResponse.json({
      ok: true,
      campaign: campaignPayload(saved[0]),
      campaigns: saved.map((row) => campaignPayload(row)),
      planned,
    });
  } catch (err) {
    if (err instanceof Error && /캠페인|사이트/.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
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
