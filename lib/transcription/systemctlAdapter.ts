import type { IncomingMessage } from "node:http";
import WebSocket from "ws";
import { appendTranscript } from "@/lib/storage/meetingStore";
import { validateMeetingId } from "@/lib/storage/paths";
import type { TranscriptSource } from "@/types/meeting";

const TRANSCRIPTION_INTENT_MODELS = new Set([
  "whisper-1",
  "gpt-realtime-whisper",
  "gpt-4o-transcribe-latest",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "gpt-4o-mini-transcribe-2025-03-20",
  "gpt-4o-mini-transcribe-2025-12-15",
]);

type ClientMessage =
  | { type: "audio"; audio: string }
  | { type: "commit" }
  | { type: "stop" };

type OpenAIEvent = {
  type?: string;
  item_id?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string; code?: string };
};

function isTranscriptionIntentModel(model: string): boolean {
  return (
    TRANSCRIPTION_INTENT_MODELS.has(model) ||
    model.endsWith("-whisper") ||
    model.includes("transcribe")
  );
}

function send(client: WebSocket, value: unknown): void {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(value));
  }
}

function speakerFor(source: TranscriptSource): string {
  return {
    mic: "外部マイク",
    system: "内部音声",
    mixed: "マイク + 内部音声",
    manual: "手動入力",
  }[source];
}

function parseRequest(request: IncomingMessage): {
  meetingId: string;
  source: TranscriptSource;
  model: string;
} {
  const url = new URL(request.url || "/", "http://localhost");
  const meetingId = validateMeetingId(url.searchParams.get("meetingId"));
  const source = url.searchParams.get("source") as TranscriptSource;
  if (!["mic", "system", "mixed"].includes(source)) {
    throw new Error("文字起こしソースが不正です");
  }
  return {
    meetingId,
    source,
    model:
      url.searchParams.get("model") ||
      process.env.MEETING_REALTIME_MODEL ||
      "gpt-4o-mini-transcribe",
  };
}

/**
 * systemctl/meeting/app.py の make_ws_transcribe_handler をNode向けに移植した薄いアダプター。
 * 24kHz PCM16、OpenAI Realtime transcription、server_vad 5秒、イベント解析を維持する。
 */
export function connectSystemctlTranscription(client: WebSocket, request: IncomingMessage): void {
  let config: ReturnType<typeof parseRequest>;
  try {
    config = parseRequest(request);
  } catch (error) {
    send(client, { type: "error", message: (error as Error).message });
    client.close();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    send(client, {
      type: "error",
      message: "OPENAI_API_KEYが設定されていません。.env.localを確認してください",
    });
    client.close();
    return;
  }

  const useTranscriptionIntent = isTranscriptionIntentModel(config.model);
  const isStreamingWhisper = config.model === "gpt-realtime-whisper";
  const noiseReduction =
    config.source === "system"
      ? null
      : { type: process.env.MEETING_NOISE_REDUCTION || "far_field" };
  const endpoint = useTranscriptionIntent
    ? "wss://api.openai.com/v1/realtime?intent=transcription"
    : `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.model)}`;
  const openai = new WebSocket(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const partials = new Map<string, string>();
  let audioReceived = false;
  let stopping = false;
  let sessionConfigured = false;

  const closeBoth = () => {
    if (openai.readyState === WebSocket.OPEN || openai.readyState === WebSocket.CONNECTING) {
      openai.close();
    }
    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
      client.close();
    }
  };

  const configureSession = () => {
    if (sessionConfigured || openai.readyState !== WebSocket.OPEN) return;
    sessionConfigured = true;
    const session = useTranscriptionIntent
      ? {
          type: "transcription",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              noise_reduction: noiseReduction,
              transcription: { model: config.model, language: "ja" },
              turn_detection: isStreamingWhisper
                ? null
                : {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 5000,
                  },
            },
          },
        }
      : {
          modalities: ["text"],
          input_audio_format: "pcm16",
          input_audio_transcription: { model: "gpt-4o-mini-transcribe", language: "ja" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 5000,
            create_response: false,
          },
        };
    openai.send(JSON.stringify({ type: "session.update", session }));
  };

  openai.on("message", async (raw) => {
    let event: OpenAIEvent;
    try {
      event = JSON.parse(raw.toString()) as OpenAIEvent;
    } catch {
      return;
    }

    if (event.type === "session.created") {
      configureSession();
      return;
    }

    if (event.type === "session.updated") {
      send(client, {
        type: "connected",
        source: config.source,
        model: config.model,
        mode: useTranscriptionIntent ? "transcription-intent" : "full-realtime",
        manualCommitRequired: isStreamingWhisper,
      });
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.delta") {
      const itemId = event.item_id || "current";
      const text = `${partials.get(itemId) || ""}${event.delta || ""}`.trim();
      partials.set(itemId, text);
      if (text) {
        send(client, { type: "partial", source: config.source, text });
      }
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const itemId = event.item_id || "current";
      partials.delete(itemId);
      const text = event.transcript?.trim();
      if (text) {
        try {
          const entry = await appendTranscript(config.meetingId, {
            text,
            source: config.source,
            speaker: speakerFor(config.source),
          });
          send(client, { type: "transcript", source: config.source, text, entry });
        } catch (error) {
          send(client, { type: "error", message: `文字起こしの保存に失敗しました: ${(error as Error).message}` });
        }
      }
      if (stopping) {
        send(client, { type: "stopped", source: config.source });
        setTimeout(closeBoth, 200);
      }
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.failed" || event.type === "error") {
      const suffix = event.error?.code ? ` (${event.error.code})` : "";
      send(client, {
        type: "error",
        message: `文字起こしエラー: ${event.error?.message || "音声を文字起こしできませんでした"}${suffix}`,
      });
      return;
    }

    if (
      event.type === "input_audio_buffer.committed" ||
      event.type === "input_audio_buffer.speech_started" ||
      event.type === "input_audio_buffer.speech_stopped"
    ) {
      send(client, { type: "processing", source: config.source, detail: event.type });
    }
  });

  openai.on("error", (error) => {
    send(client, { type: "error", message: `Realtime APIへの接続に失敗しました: ${error.message}` });
  });
  openai.on("close", () => {
    if (!stopping) {
      send(client, { type: "error", message: "Realtime APIとの接続が終了しました" });
    }
    closeBoth();
  });

  client.on("message", (raw) => {
    if (openai.readyState !== WebSocket.OPEN) {
      return;
    }
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }
    if (message.type === "audio") {
      openai.send(JSON.stringify({ type: "input_audio_buffer.append", audio: message.audio }));
      audioReceived = true;
    } else if (message.type === "commit") {
      openai.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      audioReceived = false;
    } else if (message.type === "stop") {
      stopping = true;
      if (audioReceived) {
        openai.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
        audioReceived = false;
        setTimeout(closeBoth, 10_000);
      } else {
        send(client, { type: "stopped", source: config.source });
        setTimeout(closeBoth, 200);
      }
    }
  });
  client.on("close", () => {
    stopping = true;
    if (openai.readyState === WebSocket.OPEN || openai.readyState === WebSocket.CONNECTING) {
      openai.close();
    }
  });
}
