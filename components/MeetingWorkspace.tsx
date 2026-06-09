"use client";

import { useCallback, useEffect, useState } from "react";
import type { MeetingRecord, TranscriptItem } from "@/types/meeting";
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
      <div className={`status-banner ${isError ? "is-error" : ""}`}>
        <span className="status-dot" />
        <span>{status}</span>
      </div>

      <div className="workspace-columns">
        <div className="stack">
          <RecorderPanel
            meetingId={meeting.metadata.id}
            onPartial={(source, text) => setPartials((current) => ({ ...current, [source]: text }))}
            onStatus={showStatus}
            onTranscript={addTranscript}
          />
          <CapturePanel meetingId={meeting.metadata.id} onSaved={refresh} onStatus={showStatus} />
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">MANUAL NOTE</p>
                <h2>手動メモ</h2>
              </div>
              <span className="count-badge">{meeting.manualNotes.length}件</span>
            </div>
            <form className="stack" onSubmit={saveNote}>
              <textarea
                placeholder="補足、決定事項、確認したいことを入力"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button className="secondary" disabled={!note.trim()} type="submit">メモを保存</button>
            </form>
          </section>
          <section className="panel artifact-panel">
            <div>
              <span>スクリーンショット</span>
              <strong>{meeting.screenshots.length}</strong>
            </div>
            <div>
              <span>画面録画</span>
              <strong>{meeting.recordings.length}</strong>
            </div>
            <div>
              <span>音声録音</span>
              <strong>{meeting.audioFiles.length}</strong>
            </div>
          </section>
        </div>

        <div className="stack">
          <TranscriptView partials={partials} transcript={meeting.transcript} />
          <div className="summary-action">
            <button className="primary" disabled={summarizing} onClick={createSummary} type="button">
              {summarizing ? "議事録を生成中..." : "文字起こしとメモから議事録を生成"}
            </button>
          </div>
          <SummaryView summary={meeting.summary} />
        </div>
      </div>
    </div>
  );
}
