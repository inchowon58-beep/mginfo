import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  deleteAnimal,
  deleteProjectExample,
  getVendorProfileStore,
  upsertAnimal,
  upsertProjectExample,
  upsertVendorProfile,
} from "@/lib/vendor-profile-store";
import { persistFail } from "@/lib/persist-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  try {
    const store = await getVendorProfileStore();
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    return persistFail(err);
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "").trim();
  try {
    if (action === "upsertProfile") {
      const vendorId = String(body.vendorId || "").trim();
      if (!vendorId) return NextResponse.json({ error: "vendorId 필요" }, { status: 400 });
      const result = await upsertVendorProfile({
        vendorId,
        industryId: String(body.industryId || "").trim() || undefined,
        companyName: String(body.companyName || "").trim() || undefined,
        phone: String(body.phone || "").trim() || undefined,
        website: String(body.website || "").trim() || undefined,
        address: String(body.address || "").trim() || undefined,
        businessHours: String(body.businessHours || "").trim() || undefined,
        description: String(body.description || "").trim() || undefined,
        serviceAreas: Array.isArray(body.serviceAreas)
          ? body.serviceAreas.map((s) => String(s || "").trim()).filter(Boolean)
          : undefined,
        verifiedFacts: Array.isArray(body.verifiedFacts) ? (body.verifiedFacts as never) : undefined,
        services: Array.isArray(body.services)
          ? body.services.map((s) => String(s || "").trim()).filter(Boolean)
          : undefined,
        industryData:
          body.industryData && typeof body.industryData === "object"
            ? (body.industryData as Record<string, unknown>)
            : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "upsertAnimal") {
      const vendorId = String(body.vendorId || "").trim();
      const breed = String(body.breed || "").trim();
      if (!vendorId || !breed) {
        return NextResponse.json({ error: "vendorId·breed 필요" }, { status: 400 });
      }
      const result = await upsertAnimal({
        id: String(body.id || "").trim() || undefined,
        vendorId,
        species: String(body.species || "dog").trim() || "dog",
        breed,
        sex: String(body.sex || "").trim() || undefined,
        birthDate: String(body.birthDate || "").trim() || undefined,
        color: String(body.color || "").trim() || undefined,
        name: String(body.name || "").trim() || undefined,
        status: (String(body.status || "available").trim() || "available") as never,
        description: String(body.description || "").trim() || undefined,
        media: Array.isArray(body.media) ? (body.media as never) : [],
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "deleteAnimal") {
      const id = String(body.id || "").trim();
      if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
      const store = await deleteAnimal(id);
      return NextResponse.json({ ok: true, store });
    }
    if (action === "upsertProject") {
      const vendorId = String(body.vendorId || "").trim();
      const title = String(body.title || "").trim();
      if (!vendorId || !title) {
        return NextResponse.json({ error: "vendorId·title 필요" }, { status: 400 });
      }
      const result = await upsertProjectExample({
        id: String(body.id || "").trim() || undefined,
        vendorId,
        title,
        projectType: String(body.projectType || "").trim() || undefined,
        region: String(body.region || "").trim() || undefined,
        description: String(body.description || "").trim() || undefined,
        media: Array.isArray(body.media) ? (body.media as never) : [],
        completedAt: String(body.completedAt || "").trim() || undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "deleteProject") {
      const id = String(body.id || "").trim();
      if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
      const store = await deleteProjectExample(id);
      return NextResponse.json({ ok: true, store });
    }
    return NextResponse.json({ error: "알 수 없는 동작" }, { status: 400 });
  } catch (err) {
    return persistFail(err);
  }
}
