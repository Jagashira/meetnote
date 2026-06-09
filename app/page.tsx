import { MeetingList } from "@/components/MeetingList";
import { listMeetings } from "@/lib/storage/meetingStore";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const meetings = await listMeetings();
  return (
    <>
      <section className="hero">
        <p className="eyebrow">LOCAL-FIRST MEETING MINUTES</p>
        <h1>会議の記録を、<br />このコンピューターの中に。</h1>
        <p>
          音声を文字起こしし、共有画面を記録し、構造化された議事録を生成します。
          会議データはローカルに保存されます。
        </p>
      </section>
      <MeetingList initialMeetings={meetings} />
    </>
  );
}
