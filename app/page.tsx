import { MeetingList } from "@/components/MeetingList";
import { listMeetings } from "@/lib/storage/meetingStore";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const meetings = await listMeetings();
  return (
    <div className="home-dashboard">
      <header className="home-header">
        <div>
          <p className="eyebrow">MEETING DASHBOARD</p>
          <h1>会議一覧</h1>
          <p>過去の会議を確認し、新しい会議を開始できます。</p>
        </div>
        <span className="local-storage-badge"><span className="status-dot" />ローカル保存</span>
      </header>
      <MeetingList initialMeetings={meetings} />
    </div>
  );
}
