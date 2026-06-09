import { NextResponse } from "next/server";
import { appendTranscript } from "@/lib/storage/meetingStore";
import type { TranscriptSource } from "@/types/meeting";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      text?: string;
      speaker?: string;
      source?: TranscriptSource;
    };
    const item = await appendTranscript(id, {
      text: payload.text || "",
      speaker: payload.speaker,
      source: payload.source || "manual",
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
