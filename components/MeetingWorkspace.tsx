"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MeetingRecord, TranscriptItem } from "@/types/meeting";
import { AppIcon } from "./AppIcon";
import { CapturePanel } from "./CapturePanel";
import { RecorderPanel } from "./RecorderPanel";
import { SummaryView } from "./SummaryView";
import { TranscriptView } from "./TranscriptView";

export function MeetingWorkspace({ initialMeeting }: { initialMeeting: MeetingRecord }) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [partials, setPartials] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("準備完了");
  const [isError, setIsError] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const showStatus = useCallback((message: string, error = false) => {
    setStatus(message);
    setIsError(error);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/meetings/${initialMeeting.metadata.id}`, { cache: "no-store" });
    const data = (await response.json()) as { meeting?: MeetingRecord };
    if (data.meeting) setMeeting(data.meeting);
  }, [initialMeeting.metadata.id]);

  useEffect(() => {
    const timer = window.setInterval(() => refresh().catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  function addTranscript(item: TranscriptItem) {
    setMeeting((current) => ({ ...current, transcript: [...current.transcript, item] }));
  }

  async function saveNote(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch(`/api/meetings/${meeting.metadata.id}/manual-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "メモを保存できませんでした");
      setNote("");
      showStatus("手動メモを保存しました");
      await refresh();
    } catch (error) {
      showStatus((error as Error).message, true);
    }
  }

  async function createSummary() {
    setSummarizing(true);
    showStatus("議事録を生成しています...");
    try {
      const response = await fetch(`/api/meetings/${meeting.metadata.id}/summary`, { method: "POST" });
      const data = (await response.json()) as { error?: string; summary?: string };
      if (!response.ok || !data.summary) throw new Error(data.error || "議事録を生成できませんでした");
      setMeeting((current) => ({ ...current, summary: data.summary! }));
      showStatus("議事録を生成・保存しました");
    } catch (error) {
      showStatus((error as Error).message, true);
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="workspace">
      <header className="meeting-header">
        <Link className="back-link" href="/">
          <AppIcon name="arrow-left" size={18} />
          会議一覧へ戻る
        </Link>
        <div className="meeting-title-row">
          <h1>{meeting.metadata.title}</h1>
        </div>
        <div className="meeting-meta">
          <span><AppIcon name="calendar" size={17} />{new Date(meeting.metadata.startedAt).toLocaleString("ja-JP")}</span>
          <span><AppIcon name="file" size={17} />{meeting.metadata.id}</span>
          <span className={`meeting-status ${isError ? "is-error" : ""}`}>
            <span className="status-dot" />
            {status}
          </span>
        </div>
      </header>

      <div className="workspace-top-grid">
        <RecorderPanel
          meetingId={meeting.metadata.id}
          onPartial={(source, text) => setPartials((current) => ({ ...current, [source]: text }))}
          onStatus={showStatus}
          onTranscript={addTranscript}
        />
        <CapturePanel meetingId={meeting.metadata.id} onSaved={refresh} onStatus={showStatus} />
      </div>

      <div className="workspace-bottom-grid">
        <section className="panel workspace-lower-panel manual-note-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MANUAL NOTE</p>
              <h2>手動メモ <small>{meeting.manualNotes.length}件</small></h2>
            </div>
          </div>
          <form className="manual-note-form" onSubmit={saveNote}>
            <textarea
              placeholder="補足、決定事項、確認したいことを入力"
              rows={6}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <section className="artifact-panel">
              <div><AppIcon name="camera" /><span>スクリーンショット</span><strong>{meeting.screenshots.length}</strong></div>
              <div><AppIcon name="video" /><span>画面録画</span><strong>{meeting.recordings.length}</strong></div>
              <div><AppIcon name="mic" /><span>音声録音</span><strong>{meeting.audioFiles.length}</strong></div>
            </section>
            <button className="note-save" disabled={!note.trim()} type="submit">メモを保存</button>
          </form>
        </section>

        <TranscriptView partials={partials} transcript={meeting.transcript} />
        <SummaryView onCreate={createSummary} summarizing={summarizing} summary={meeting.summary} />
      </div>
    </div>
  );
}
