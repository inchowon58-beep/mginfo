import { BulkPlanner } from "@/components/admin/BulkPlanner";
import { PersistNotice } from "@/components/admin/PersistNotice";
import { bulkStats, defaultBulkPublish } from "@/lib/bulk-publish";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBulkPage() {
  const store = await readStore();
  const bulk = store.bulkPublish || defaultBulkPublish();
  return (
    <div className="settings-stack">
      <PersistNotice />
      <header className="admin-dash-head">
        <div>
          <p className="admin-dash-kicker">예약 발행</p>
          <h2>대량발행예약</h2>
          <p>카테고리별로 키워드를 쌓아 두고, 하루 수량만큼 시간 간격을 두고 발행합니다.</p>
        </div>
      </header>
      <BulkPlanner initialBulk={bulk} initialStats={bulkStats(bulk, store.categories || [])} categories={store.categories || []} />
    </div>
  );
}
