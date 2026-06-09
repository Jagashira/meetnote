import { NextResponse } from "next/server";
import { dataRoot } from "@/lib/storage/paths";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    dataRoot: dataRoot(),
    realtimeModel: process.env.MEETING_REALTIME_MODEL || "gpt-4o-mini-transcribe",
    summaryModel: process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini",
  });
}
