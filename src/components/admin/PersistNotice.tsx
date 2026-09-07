import { persistenceReady } from "@/lib/db";

export function PersistNotice() {
  if (persistenceReady()) return null;
  return (
    <div className="admin-alert">
      <b>글이 사이트에 남지 않습니다.</b>
      Vercel Storage에서 <b>Upstash Redis</b>를 만든 뒤 이 프로젝트에 연결하고, 재배포하세요.
      연결되면 환경 변수 <code>KV_REST_API_URL</code> / <code>KV_REST_API_TOKEN</code>이 생깁니다.
    </div>
  );
}
