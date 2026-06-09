"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "./AppIcon";

const DEMO_SECONDS = 30;

type DemoStatus = "idle" | "recording" | "processing" | "done" | "error";

type LockedFeature = {
  description: string;
  icon: AppIconName;
  label: string;
};

const LOCKED_FEATURES: LockedFeature[] = [
  {
    description: "共有画面の一場面をPNGとして会議フォルダーへ保存できます",
    icon: "camera",
    label: "スクリーンショット",
  },
  {
    description: "内部音声・外部マイク・両方から選んで画面を録画できます",
    icon: "video",
    label: "画面録画",
  },
  {
    description: "マイク音声を会議データと一緒に録音・保存できます",
    icon: "mic",
    label: "音声録音",
  },
  {
    description: "文字起こしと手動メモから、決定事項やToDoを含む議事録を生成できます",
    icon: "sparkles",
    label: "議事録生成",
  },
];

function supportedMimeType(): string | undefined {
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(type: string): string {
  return type.includes("mp4") ? "mp4" : "webm";
}

export function PublicDemoWorkspace() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [remaining, setRemaining] = useState(DEMO_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [lockedFeature, setLockedFeature] = useState<LockedFeature | null>(null);

  function clearTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribe(blob: Blob, durationMs: number) {
    setStatus("processing");
    try {
      const type = blob.type || "audio/webm";
      const form = new FormData();
      form.append("audio", blob, `minutedock-demo.${extensionFor(type)}`);
      form.append("durationMs", String(Math.min(durationMs, DEMO_SECONDS * 1000)));
      const response = await fetch("/api/demo/transcribe", { body: form, method: "POST" });
      const result = (await response.json()) as { error?: string; text?: string };
      if (!response.ok) throw new Error(result.error || "文字起こしに失敗しました");
      setTranscript(result.text || "音声を認識できませんでした。もう一度、マイクに近づいてお試しください。");
      setStatus("done");
    } catch (transcriptionError) {
      setError((transcriptionError as Error).message);
      setStatus("error");
    }
  }

  function stopRecording() {
    clearTimers();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    setRemaining(DEMO_SECONDS);

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("このブラウザはマイク録音に対応していません");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mimeType = supportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearTimers();
        stopStream();
        setError("マイク音声を録音できませんでした");
        setStatus("error");
      };
      recorder.onstop = () => {
        clearTimers();
        stopStream();
        recorderRef.current = null;
        if (disposedRef.current) return;
        const durationMs = Math.max(1, Date.now() - startedAtRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setError("音声を取得できませんでした");
          setStatus("error");
          return;
        }
        void transcribe(blob, durationMs);
      };

      recorder.start();
      setStatus("recording");
      intervalRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setRemaining(Math.max(0, DEMO_SECONDS - elapsedSeconds));
      }, 250);
      timeoutRef.current = setTimeout(stopRecording, DEMO_SECONDS * 1000);
    } catch (recordingError) {
      stopStream();
      setError(
        (recordingError as DOMException).name === "NotAllowedError"
          ? "マイクの使用が許可されませんでした。ブラウザの設定をご確認ください。"
          : (recordingError as Error).message,
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      clearTimers();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopStream();
    };
  }, []);

  const recording = status === "recording";
  const processing = status === "processing";

  return (
    <div className="public-demo-page">
      <header className="public-demo-nav">
        <Link className="landing-brand" href="/">
          <span className="brand-mark">M</span>
          <strong>Minute<span>Dock</span></strong>
        </Link>
        <div>
          <span className="demo-badge"><span className="status-dot" />PUBLIC DEMO</span>
          <Link href="/">紹介ページへ戻る</Link>
        </div>
      </header>

      <main className="public-demo-shell">
        <section className="public-demo-heading">
          <div>
            <p className="eyebrow">30 SECOND TRANSCRIPTION DEMO</p>
            <h1>MinuteDockを、<br />30秒だけ試す。</h1>
            <p>マイクに向かって話すと、最大30秒の音声を文字起こしします。録音データと結果はMinuteDockへ保存されません。</p>
          </div>
          <div className="demo-consent-note">
            <AppIcon name="mic" size={19} />
            <p><strong>ご自身の音声でお試しください</strong><span>文字起こしのため、録音した音声はOpenAIへ送信されます。</span></p>
          </div>
        </section>

        <section className="public-demo-grid">
          <article className="demo-transcription-card">
            <div className="demo-card-label">
              <span>30 SECOND TRANSCRIPT</span>
              <span className={`state-pill ${recording ? "live" : ""}`}>
                {recording ? "録音中" : processing ? "処理中" : "デモ"}
              </span>
            </div>
            <div className={`demo-mic-orb ${recording ? "is-recording" : ""}`}>
              <AppIcon name="mic" size={40} strokeWidth={2} />
              {recording && <span />}
            </div>
            <div className="demo-timer">
              <strong>00:{String(remaining).padStart(2, "0")}</strong>
              <span>最大30秒で自動停止します</span>
            </div>
            <button
              className={recording ? "demo-stop-button" : "demo-start-button"}
              disabled={processing}
              onClick={recording ? stopRecording : startRecording}
              type="button"
            >
              <AppIcon name={recording ? "record" : "mic"} size={18} />
              {recording ? "録音を停止して文字起こし" : processing ? "文字起こし中..." : "30秒文字起こしを始める"}
            </button>
            <p className="demo-microcopy">ブラウザからマイクの使用許可を求められます。</p>
          </article>

          <article className="demo-result-card">
            <div className="demo-card-label">
              <span>TRANSCRIPT</span>
              {transcript && <button onClick={() => setTranscript("")} type="button">クリア</button>}
            </div>
            <div aria-live="polite" className={`demo-transcript-result ${error ? "has-error" : ""}`}>
              {processing ? (
                <div className="demo-processing"><span /><strong>音声を文字にしています...</strong><small>数秒ほどお待ちください</small></div>
              ) : error ? (
                <div className="demo-empty-result"><AppIcon name="help" size={30} /><strong>{error}</strong></div>
              ) : transcript ? (
                <p>{transcript}</p>
              ) : (
                <div className="demo-empty-result"><AppIcon name="transcript" size={38} /><strong>文字起こし結果がここに表示されます</strong><span>左のボタンからデモを開始してください。</span></div>
              )}
            </div>
          </article>
        </section>

        <section className="demo-locked-section">
          <div>
            <p className="eyebrow">FULL PRODUCT FEATURES</p>
            <h2>本来のMinuteDockで使える機能</h2>
            <p>公開サンプルでは文字起こしだけ体験できます。各機能を押すと、本体での使い方を確認できます。</p>
          </div>
          <div className="demo-feature-buttons">
            {LOCKED_FEATURES.map((feature) => (
              <button key={feature.label} onClick={() => setLockedFeature(feature)} type="button">
                <span><AppIcon name={feature.icon} size={22} /></span>
                <strong>{feature.label}</strong>
                <small>機能を見る</small>
              </button>
            ))}
          </div>
        </section>
      </main>

      {lockedFeature && (
        <div className="demo-modal-backdrop" onMouseDown={() => setLockedFeature(null)} role="presentation">
          <div
            aria-labelledby="demo-modal-title"
            aria-modal="true"
            className="demo-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span className="demo-modal-icon"><AppIcon name={lockedFeature.icon} size={28} /></span>
            <p className="eyebrow">AVAILABLE IN MINUTEDOCK</p>
            <h2 id="demo-modal-title">{lockedFeature.label}</h2>
            <p>公開サンプルでは、この機能は操作できません。</p>
            <p className="demo-modal-description">本来のMinuteDockでは、{lockedFeature.description}。</p>
            <button className="primary" onClick={() => setLockedFeature(null)} type="button">デモに戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}
