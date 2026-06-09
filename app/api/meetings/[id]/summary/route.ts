import { NextResponse } from "next/server";
import { generateSummary } from "@/lib/openai/summarize";
import { getMeeting, saveSummary } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const meeting = await getMeeting(id);
    const summary = await generateSummary(meeting.transcript, meeting.manualNotes);
    await saveSummary(id, summary);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json(
      { error: message },
      { status: message.includes("OPENAI_API_KEY") ? 400 : 500 },
    );
  }
}
