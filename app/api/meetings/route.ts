import { NextResponse } from "next/server";
import { createMeeting, listMeetings } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ meetings: await listMeetings() });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { title?: string };
    const meeting = await createMeeting(payload.title);
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
