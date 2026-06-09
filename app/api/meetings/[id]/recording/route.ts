import { NextResponse } from "next/server";
import { saveRecording } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const recording = form.get("recording");
    const kind = form.get("kind") === "audio" ? "audio" : "screen";
    if (!(recording instanceof File) || recording.size === 0) {
      throw new Error("録画データが送信されていません");
    }
    const result = await saveRecording(id, Buffer.from(await recording.arrayBuffer()), kind);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
