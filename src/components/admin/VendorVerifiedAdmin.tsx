"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdVendor } from "@/lib/types";
import type { Animal, ProjectExample, VendorProfile, VendorProfileStore } from "@/lib/vendor-profile-types";

type FactRow = { key: string; label: string; value: string };

export function VendorVerifiedAdmin() {
  const [vendors, setVendors] = useState<AdVendor[]>([]);
  const [store, setStore] = useState<VendorProfileStore | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [businessHours, setBusinessHours] = useState("");
  const [consultationMethods, setConsultationMethods] = useState("");
  const [visitPolicy, setVisitPolicy] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [factsText, setFactsText] = useState("");
  const [servicesText, setServicesText] = useState("");

  const [animalBreed, setAnimalBreed] = useState("포메라니안");
  const [animalName, setAnimalName] = useState("");
  const [animalSex, setAnimalSex] = useState("");
  const [animalBirth, setAnimalBirth] = useState("");

  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState("상가철거");
  const [projectRegion, setProjectRegion] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [vRes, pRes] = await Promise.all([fetch("/api/ad-vendors"), fetch("/api/vendor-profiles")]);
    const vData = await vRes.json().catch(() => ({}));
    const pData = await pRes.json().catch(() => ({}));
    if (!vRes.ok) {
      setError(vData.error || "업체 목록 실패");
      return;
    }
    if (!pRes.ok) {
      setError(pData.error || "Verified 데이터 실패");
      return;
    }
    const list = (vData.vendors || []) as AdVendor[];
    setVendors(list);
    setStore(pData.store as VendorProfileStore);
    if (!vendorId && list[0]) setVendorId(list[0].id);
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const profile: VendorProfile | null = useMemo(() => {
    if (!store || !vendorId) return null;
    return store.profiles.find((p) => p.vendorId === vendorId) || null;
  }, [store, vendorId]);

  const animals: Animal[] = useMemo(
    () => (store && vendorId ? store.animals.filter((a) => a.vendorId === vendorId) : []),
    [store, vendorId]
  );
  const projects: ProjectExample[] = useMemo(
    () => (store && vendorId ? store.projectExamples.filter((p) => p.vendorId === vendorId) : []),
    [store, vendorId]
  );

  useEffect(() => {
    if (!profile) {
      setBusinessHours("");
      setConsultationMethods("");
      setVisitPolicy("");
      setIndustryId("");
      setFactsText("");
      setServicesText("");
      return;
    }
    setBusinessHours(profile.businessHours || "");
    setIndustryId(profile.industryId || "");
    const methods = profile.industryData?.consultationMethods;
    setConsultationMethods(Array.isArray(methods) ? methods.join(", ") : String(methods || ""));
    setVisitPolicy(String(profile.industryData?.visitPolicy || ""));
    setFactsText(
      profile.verifiedFacts
        .map((f) => `${f.key}|${f.label}|${Array.isArray(f.value) ? f.value.join("/") : f.value}`)
        .join("\n")
    );
    setServicesText(profile.services.join(", "));
  }, [profile]);

  async function put(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/vendor-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장 실패");
        return;
      }
      if (data.store) setStore(data.store as VendorProfileStore);
      else await load();
    } finally {
      setBusy(false);
    }
  }

  function parseFacts(text: string): FactRow[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, label, value] = line.split("|").map((s) => s.trim());
        return { key: key || "fact", label: label || key || "항목", value: value || "" };
      })
      .filter((f) => f.value);
  }

  const vendor = vendors.find((v) => v.id === vendorId);

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <h2>Verified 업체 데이터</h2>
        <p className="hint">
          AdVendor(상호·전화·주소)는 기존 「광고업체정보설정」을 그대로 씁니다. 여기서는 영업시간·Facts·개체·시공
          사례만 확장합니다. Gemini가 이 데이터를 만들어내지 않습니다.
        </p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          업체 선택
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        {vendor ? (
          <p className="hint">
            연결: {vendor.name} · {vendor.phone || "전화 없음"} · {vendor.address || "주소 없음"}
          </p>
        ) : null}
      </div>

      <div className="admin-card">
        <h3>기본 Verified 확장</h3>
        <label>
          industryId (예: ind-dog-adoption / ind-demolition)
          <input value={industryId} onChange={(e) => setIndustryId(e.target.value)} />
        </label>
        <label>
          영업시간
          <input value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="평일 10:00-19:00" />
        </label>
        <label>
          상담 방식 (쉼표 구분)
          <input
            value={consultationMethods}
            onChange={(e) => setConsultationMethods(e.target.value)}
            placeholder="방문상담, 전화상담"
          />
        </label>
        <label>
          방문 정책
          <input value={visitPolicy} onChange={(e) => setVisitPolicy(e.target.value)} placeholder="예약제" />
        </label>
        <label>
          서비스 (쉼표)
          <input value={servicesText} onChange={(e) => setServicesText(e.target.value)} />
        </label>
        <label>
          Verified Facts (한 줄에 key|label|value)
          <textarea
            rows={4}
            value={factsText}
            onChange={(e) => setFactsText(e.target.value)}
            placeholder={"years_in_business|운영 경력|20년 이상\nspecialty|주요 취급 품종|포메라니안/말티푸"}
          />
        </label>
        <button
          type="button"
          className="gold"
          disabled={busy || !vendorId}
          onClick={() => {
            const facts = parseFacts(factsText).map((f) => ({
              key: f.key,
              label: f.label,
              value: f.value.includes("/") ? f.value.split("/").map((s) => s.trim()) : f.value,
              verified: true,
              verifiedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
            const methods = consultationMethods
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            void put({
              action: "upsertProfile",
              vendorId,
              industryId: industryId || undefined,
              businessHours: businessHours || undefined,
              services: servicesText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              verifiedFacts: facts,
              industryData: {
                consultationMethods: methods,
                visitPolicy: visitPolicy || undefined,
              },
            });
          }}
        >
          프로필 저장
        </button>
      </div>

      <div className="admin-card">
        <h3>실제 개체 (강아지분양)</h3>
        <div className="admin-inline-actions">
          <input value={animalBreed} onChange={(e) => setAnimalBreed(e.target.value)} placeholder="품종" />
          <input value={animalName} onChange={(e) => setAnimalName(e.target.value)} placeholder="이름(선택)" />
          <input value={animalSex} onChange={(e) => setAnimalSex(e.target.value)} placeholder="성별" />
          <input value={animalBirth} onChange={(e) => setAnimalBirth(e.target.value)} placeholder="생년월일" />
          <button
            type="button"
            className="gold"
            disabled={busy || !vendorId || !animalBreed.trim()}
            onClick={() =>
              void put({
                action: "upsertAnimal",
                vendorId,
                breed: animalBreed.trim(),
                name: animalName.trim() || undefined,
                sex: animalSex.trim() || undefined,
                birthDate: animalBirth.trim() || undefined,
                species: "dog",
                status: "available",
                media: [],
              })
            }
          >
            개체 추가
          </button>
        </div>
        <ul className="hint">
          {animals.map((a) => (
            <li key={a.id}>
              [{a.status}] {a.breed} {a.name || ""} {a.sex || ""}{" "}
              <button type="button" className="ghost" disabled={busy} onClick={() => void put({ action: "deleteAnimal", id: a.id })}>
                삭제
              </button>
            </li>
          ))}
          {!animals.length ? <li>등록된 개체 없음</li> : null}
        </ul>
      </div>

      <div className="admin-card">
        <h3>실제 시공 사례 (철거)</h3>
        <div className="admin-inline-actions">
          <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="제목" />
          <input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="유형" />
          <input value={projectRegion} onChange={(e) => setProjectRegion(e.target.value)} placeholder="지역" />
          <button
            type="button"
            className="gold"
            disabled={busy || !vendorId || !projectTitle.trim()}
            onClick={() =>
              void put({
                action: "upsertProject",
                vendorId,
                title: projectTitle.trim(),
                projectType: projectType.trim() || undefined,
                region: projectRegion.trim() || undefined,
                media: [],
              })
            }
          >
            사례 추가
          </button>
        </div>
        <ul className="hint">
          {projects.map((p) => (
            <li key={p.id}>
              {p.title} ({p.projectType || "-"} / {p.region || "-"}){" "}
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => void put({ action: "deleteProject", id: p.id })}
              >
                삭제
              </button>
            </li>
          ))}
          {!projects.length ? <li>등록된 사례 없음</li> : null}
        </ul>
      </div>
    </div>
  );
}
