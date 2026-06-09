import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_DURATION_MS = 30_500;
const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "video/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
];

type OpenAITranscriptionResponse = {
  text?: string;
  error?: { message?: string };
};

function isSupportedAudio(file: File): boolean {
  return SUPPORTED_AUDIO_TYPES.some((type) => file.type.startsWith(type));
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "公開デモの文字起こしは現在準備中です" },
        { status: 503 },
      );
    }

    const input = await request.formData().catch(() => null);
    if (!input) {
      throw new Error("音声データをフォーム形式で送信してください");
    }
    const audio = input.get("audio");
    const durationMs = Number(input.get("durationMs"));

    if (!(audio instanceof File) || audio.size === 0) {
      throw new Error("音声データが送信されていません");
    }
    if (!isSupportedAudio(audio)) {
      throw new Error("この音声形式には対応していません");
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      throw new Error("音声データが公開デモの上限を超えています");
    }
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_DURATION_MS) {
      throw new Error("公開デモでは30秒以内の音声だけ文字起こしできます");
    }

    const model = process.env.DEMO_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
    const form = new FormData();
    form.append("file", audio, audio.name || "minutedock-demo.webm");
    form.append("model", model);
    form.append("language", "ja");
    form.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      body: form,
      headers: { Authorization: `Bearer ${apiKey}` },
      method: "POST",
    });
    const result = (await response.json()) as OpenAITranscriptionResponse;

    if (!response.ok) {
      throw new Error(result.error?.message || "音声を文字起こしできませんでした");
    }

    return NextResponse.json(
      { text: result.text?.trim() || "", model },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { headers: { "Cache-Control": "no-store" }, status: 400 },
    );
  }
}
