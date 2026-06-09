import { NextResponse } from "next/server";
import { getMeeting } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ meeting: await getMeeting(id) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
