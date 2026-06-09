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

  return <MeetingWorkspace initialMeeting={meeting} />;
}
