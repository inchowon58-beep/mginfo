import { persistenceReady } from "@/lib/db";

export function PersistNotice() {
  if (persistenceReady()) return null;
  return (
    <div className="admin-alert">
      <b>글이 사이트에 남지 않습니다.</b>
      Browse Stores 검색창에 <b>Blob</b>을 입력해 만든 뒤, 이 프로젝트에 연결하고 재배포하세요.
    </div>
  );
}
