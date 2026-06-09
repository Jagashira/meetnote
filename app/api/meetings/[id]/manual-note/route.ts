import { NextResponse } from "next/server";
import { appendManualNote } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { text?: string };
    const note = await appendManualNote(id, payload.text || "");
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
