import { notFound } from "next/navigation";
import { SummaryView } from "@/components/SummaryView";
import { getMeeting } from "@/lib/storage/meetingStore";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const meeting = await getMeeting(id);
    return <SummaryView summary={meeting.summary} />;
  } catch {
    notFound();
  }
}
