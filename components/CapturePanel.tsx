"use client";

import { useRef, useState } from "react";

type UploadResult = {
  file?: string;
  compatibilityFile?: string;
  warning?: string;
};

type RecordingSources = {
  recordingStream: MediaStream;
  sourceStreams: MediaStream[];
  audioContext?: AudioContext;
  internalAudio: boolean;
  externalAudio: boolean;
};

type ScreenAudioMode = "internal" | "external" | "both";

const SCREEN_AUDIO_OPTIONS: Array<{ value: ScreenAudioMode; label: string; description: string }> = [
  { value: "internal", label: "内部音声", description: "共有するタブ・画面の音声" },
  { value: "external", label: "外部音声", description: "この端末のマイク音声" },
  { value: "both", label: "両方", description: "内部音声とマイクをミックス" },
];

async function uploadBlob(
  meetingId: string,
  endpoint: string,
  key: string,
  blob: Blob,
  kind?: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append(key, blob, key === "image" ? "screenshot.png" : "recording.webm");
  if (kind) form.append("kind", kind);
  const response = await fetch(`/api/meetings/${meetingId}/${endpoint}`, { method: "POST", body: form });
  const data = (await response.json()) as UploadResult & { error?: string };
  if (!response.ok) throw new Error(data.error || "保存に失敗しました");
  return data;
}

export function CapturePanel({
  meetingId,
  onSaved,
  onStatus,
}: {
  meetingId: string;
  onSaved: () => void;
  onStatus: (message: string, isError?: boolean) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sourcesRef = useRef<RecordingSources | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [screenAudioMode, setScreenAudioMode] = useState<ScreenAudioMode>("both");

  async function captureScreenshot() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNGへの変換に失敗しました");
      await uploadBlob(meetingId, "screenshot", "image", blob);
      onStatus("スクリーンショットを保存しました");
      onSaved();
    } catch (error) {
      onStatus(`スクリーンショットを保存できませんでした: ${(error as Error).message}`, true);
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function startRecording(kind: "screen" | "audio") {
    let sources: RecordingSources | null = null;
    const pendingStreams: MediaStream[] = [];
    let pendingAudioContext: AudioContext | null = null;
    try {
      if (kind === "screen") {
        const needsInternalAudio = screenAudioMode === "internal" || screenAudioMode === "both";
        const needsExternalAudio = screenAudioMode === "external" || screenAudioMode === "both";
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: needsInternalAudio,
        });
        pendingStreams.push(displayStream);
        let microphoneStream: MediaStream | null = null;
        if (needsExternalAudio) {
          microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
          });
          pendingStreams.push(microphoneStream);
        }

        const audioContext = new AudioContext();
        pendingAudioContext = audioContext;
        const destination = audioContext.createMediaStreamDestination();
        const sourceStreams = microphoneStream
          ? [displayStream, microphoneStream]
          : [displayStream];
        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          audioContext
            .createMediaStreamSource(new MediaStream(displayAudioTracks))
            .connect(destination);
        }
        const microphoneTracks = microphoneStream?.getAudioTracks() || [];
        if (microphoneStream && microphoneTracks.length > 0) {
          audioContext
            .createMediaStreamSource(new MediaStream(microphoneTracks))
            .connect(destination);
        }

        const recordingStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
        if (needsInternalAudio && displayAudioTracks.length === 0) {
          throw new Error(
            "内部音声を取得できませんでした。共有ダイアログで音声共有を有効にしてください",
          );
        }
        if (needsExternalAudio && microphoneTracks.length === 0) {
          throw new Error("外部マイク音声を取得できませんでした");
        }
        sources = {
          recordingStream,
          sourceStreams,
          audioContext,
          internalAudio: displayAudioTracks.length > 0,
          externalAudio: microphoneTracks.length > 0,
        };
      } else {
        const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        pendingStreams.push(microphoneStream);
        sources = {
          recordingStream: microphoneStream,
          sourceStreams: [microphoneStream],
          internalAudio: false,
          externalAudio: microphoneStream.getAudioTracks().length > 0,
        };
      }

      const activeSources = sources;
      const preferredMimeType = kind === "audio" ? "audio/webm" : "video/webm";
      const recorder = MediaRecorder.isTypeSupported(preferredMimeType)
        ? new MediaRecorder(activeSources.recordingStream, { mimeType: preferredMimeType })
        : new MediaRecorder(activeSources.recordingStream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || preferredMimeType,
          });
          const result = await uploadBlob(meetingId, "recording", "recording", blob, kind);
          if (result.warning) {
            onStatus(result.warning, true);
          } else if (kind === "screen" && result.compatibilityFile) {
            onStatus("画面録画をWebMとQuickTime対応MP4で保存しました");
          } else {
            onStatus(kind === "screen" ? "画面録画を保存しました" : "音声録音を保存しました");
          }
          onSaved();
        } catch (error) {
          onStatus(`録画を保存できませんでした: ${(error as Error).message}`, true);
        } finally {
          activeSources.recordingStream.getTracks().forEach((track) => track.stop());
          activeSources.sourceStreams.forEach((stream) =>
            stream.getTracks().forEach((track) => track.stop()),
          );
          activeSources.audioContext?.close().catch(() => undefined);
          recorderRef.current = null;
          sourcesRef.current = null;
          setRecording(false);
          setAudioRecording(false);
        }
      };
      activeSources.recordingStream.getVideoTracks().forEach((track) =>
        track.addEventListener(
          "ended",
          () => {
            if (recorder.state === "recording") recorder.stop();
          },
          { once: true },
        ),
      );
      recorderRef.current = recorder;
      sourcesRef.current = activeSources;
      recorder.start(1000);
      if (kind === "screen") {
        setRecording(true);
      } else {
        setAudioRecording(true);
      }
      if (kind === "screen") {
        const selectedMode = SCREEN_AUDIO_OPTIONS.find((option) => option.value === screenAudioMode);
        onStatus(`画面を録画中です。音声: ${selectedMode?.label || screenAudioMode}`);
      } else {
        onStatus("マイク音声を録音中です");
      }
    } catch (error) {
      sources?.recordingStream.getTracks().forEach((track) => track.stop());
      pendingStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      pendingAudioContext?.close().catch(() => undefined);
      onStatus(`録画を開始できませんでした: ${(error as Error).message}`, true);
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CAPTURE</p>
          <h2>記録</h2>
        </div>
        <span className={`state-pill ${recording || audioRecording ? "live" : ""}`}>
          {recording || audioRecording ? "録画中" : "待機中"}
        </span>
      </div>
      <fieldset className="recording-source-picker" disabled={recording || audioRecording}>
        <legend>画面録画に含める音声</legend>
        <div className="recording-source-options">
          {SCREEN_AUDIO_OPTIONS.map((option) => (
            <label
              className={`recording-source-option ${screenAudioMode === option.value ? "selected" : ""}`}
              key={option.value}
            >
              <input
                checked={screenAudioMode === option.value}
                name="screen-audio-mode"
                onChange={() => setScreenAudioMode(option.value)}
                type="radio"
                value={option.value}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="button-grid">
        <button className="secondary" disabled={recording || audioRecording} onClick={captureScreenshot} type="button">
          スクリーンショット
        </button>
        <button
          className={recording ? "danger" : "secondary"}
          disabled={audioRecording}
          onClick={() => (recording ? stopRecording() : startRecording("screen"))}
          type="button"
        >
          {recording ? "画面録画を停止・保存" : "画面録画を開始"}
        </button>
        <button
          className={audioRecording ? "danger" : "secondary"}
          disabled={recording}
          onClick={() => (audioRecording ? stopRecording() : startRecording("audio"))}
          type="button"
        >
          {audioRecording ? "音声録音を停止・保存" : "マイク音声を録音"}
        </button>
      </div>
    </section>
  );
}
