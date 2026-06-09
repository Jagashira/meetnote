"use client";

import { useRef, useState } from "react";
import type { TranscriptItem, TranscriptSource } from "@/types/meeting";

type ActiveCapture = {
  stream: MediaStream;
  context: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  websocket: WebSocket;
};

type RealtimeMessage = {
  type: string;
  source?: TranscriptSource;
  text?: string;
  message?: string;
  entry?: TranscriptItem;
  model?: string;
  manualCommitRequired?: boolean;
};

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function int16ToBase64(input: Int16Array): string {
  const bytes = new Uint8Array(input.buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function calculateRms(input: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < input.length; index += 1) {
    sum += input[index] * input[index];
  }
  return Math.sqrt(sum / Math.max(1, input.length));
}

function realtimeUrl(meetingId: string, source: TranscriptSource): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/realtime-transcription?meetingId=${encodeURIComponent(meetingId)}&source=${source}`;
}

export function RecorderPanel({
  meetingId,
  onTranscript,
  onPartial,
  onStatus,
}: {
  meetingId: string;
  onTranscript: (item: TranscriptItem) => void;
  onPartial: (source: string, text: string) => void;
  onStatus: (message: string, isError?: boolean) => void;
}) {
  const captures = useRef<Partial<Record<TranscriptSource, ActiveCapture>>>({});
  const [active, setActive] = useState<Partial<Record<TranscriptSource, boolean>>>({});

  function stop(source: TranscriptSource) {
    const capture = captures.current[source];
    if (!capture) return;
    try {
      capture.websocket.send(JSON.stringify({ type: "stop" }));
    } catch {
      // Connection may already be closed.
    }
    capture.processor.disconnect();
    capture.sourceNode.disconnect();
    capture.context.close().catch(() => undefined);
    capture.stream.getTracks().forEach((track) => track.stop());
    setTimeout(() => {
      if (capture.websocket.readyState === WebSocket.OPEN) {
        capture.websocket.close();
      }
    }, 12_000);
    delete captures.current[source];
    setActive((current) => ({ ...current, [source]: false }));
    onPartial(source, "");
    onStatus(`${source === "mic" ? "マイク" : "内部音声"}の文字起こしを停止しました`);
  }

  async function connect(stream: MediaStream, source: "mic" | "system") {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error(
        source === "system"
          ? "共有した画面に音声が含まれていません。Chromeタブを選び「タブの音声を共有」を有効にしてください"
          : "マイク音声を取得できませんでした",
      );
    }

    const context = new AudioContext({ sampleRate: 24000 });
    const audioOnlyStream = new MediaStream(audioTracks);
    const sourceNode = context.createMediaStreamSource(audioOnlyStream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    sourceNode.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);

    const websocket = new WebSocket(realtimeUrl(meetingId, source));
    let manualCommitRequired = false;
    let speechDetected = false;
    let lastVoiceAt = 0;
    let lastCommitAt = 0;
    captures.current[source] = { stream, context, sourceNode, processor, websocket };
    setActive((current) => ({ ...current, [source]: true }));

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data) as RealtimeMessage;
      if (data.type === "connected") {
        manualCommitRequired = Boolean(data.manualCommitRequired);
        onStatus(`${source === "mic" ? "マイク" : "内部音声"}文字起こし中 (${data.model})`);
      } else if (data.type === "partial") {
        onPartial(source, data.text || "");
      } else if (data.type === "transcript" && data.entry) {
        onPartial(source, "");
        onTranscript(data.entry);
      } else if (data.type === "error") {
        onStatus(data.message || "文字起こしエラーが発生しました", true);
      }
    };
    websocket.onclose = () => {
      if (captures.current[source]?.websocket === websocket) {
        stop(source);
      }
    };
    websocket.onerror = () => onStatus("文字起こしサーバーへ接続できませんでした", true);

    processor.onaudioprocess = (event) => {
      if (websocket.readyState !== WebSocket.OPEN) return;
      const audio = event.inputBuffer.getChannelData(0);
      const now = Date.now();
      const rms = calculateRms(audio);
      if (rms >= 0.003) {
        speechDetected = true;
        lastVoiceAt = now;
      } else if (
        manualCommitRequired &&
        speechDetected &&
        now - lastVoiceAt >= 1_200 &&
        now - lastCommitAt >= 1_500
      ) {
        websocket.send(JSON.stringify({ type: "commit" }));
        speechDetected = false;
        lastCommitAt = now;
      }
      const pcm = floatTo16BitPcm(audio);
      websocket.send(JSON.stringify({ type: "audio", audio: int16ToBase64(pcm) }));
    };
    stream.getTracks().forEach((track) => {
      track.addEventListener("ended", () => stop(source), { once: true });
    });
  }

  async function startMic() {
    try {
      onStatus("マイクの使用許可を待っています...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      await connect(stream, "mic");
    } catch (error) {
      onStatus(`マイクを開始できませんでした: ${(error as Error).message}`, true);
    }
  }

  async function startSystem() {
    try {
      onStatus("共有画面と音声を選択してください...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (error) {
        if ((error as DOMException).name !== "TypeError") throw error;
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }
      await connect(stream, "system");
    } catch (error) {
      onStatus(`内部音声を開始できませんでした: ${(error as Error).message}`, true);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">REALTIME</p>
          <h2>文字起こし</h2>
        </div>
        <span className={`state-pill ${active.mic || active.system ? "live" : ""}`}>
          {active.mic || active.system ? "文字起こし中" : "待機中"}
        </span>
      </div>
      <p className="muted">
        <code>systemctl</code>と同じ24kHz PCM16・Realtime API・server_vad方式を使用します。
      </p>
      <div className="button-grid">
        <button
          className={active.mic ? "danger" : "secondary"}
          onClick={() => (active.mic ? stop("mic") : startMic())}
          type="button"
        >
          {active.mic ? "マイク文字起こしを停止" : "マイク文字起こしを開始"}
        </button>
        <button
          className={active.system ? "danger" : "secondary"}
          onClick={() => (active.system ? stop("system") : startSystem())}
          type="button"
        >
          {active.system ? "内部音声文字起こしを停止" : "共有画面の音声を文字起こし"}
        </button>
      </div>
      <p className="hint">内部音声は、共有ダイアログで音声共有を有効にした場合のみ取得できます。</p>
    </section>
  );
}
