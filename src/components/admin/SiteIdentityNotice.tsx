import Link from "next/link";
import { missingSiteIdentityFields } from "@/lib/site-identity";
import type { Settings } from "@/lib/types";

export function SiteIdentityNotice({ settings }: { settings: Pick<Settings, "company" | "phone" | "address"> }) {
  const missing = missingSiteIdentityFields(settings);
  if (!missing.length) return null;
  return (
    <div className="admin-alert">
      <b>넘긴 사이트 신원(NAP)이 비어 있습니다.</b>
      푸터와 JSON-LD에 쓸 <b>{missing.join(" · ")}</b>를{" "}
      <Link href="/admin/settings">기본설정</Link>에 실제 값으로 넣어 주세요. 없는 주소·상호를 지어내지 마세요.
    </div>
  );
}
