import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingWorkspace } from "@/components/MeetingWorkspace";
import { getMeeting } from "@/lib/storage/meetingStore";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let meeting;
  try {
    meeting = await getMeeting(id);
  } catch {
    notFound();
  }

  return (
    <>
      <section className="meeting-header">
        <div>
          <Link className="back-link" href="/">会議一覧へ戻る</Link>
          <p className="eyebrow">MEETING WORKSPACE</p>
          <h1>{meeting.metadata.title}</h1>
          <p className="muted">{new Date(meeting.metadata.startedAt).toLocaleString("ja-JP")}</p>
        </div>
        <code>{meeting.metadata.id}</code>
      </section>
      <MeetingWorkspace initialMeeting={meeting} />
    </>
  );
}
