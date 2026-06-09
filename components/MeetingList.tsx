"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingMetadata } from "@/types/meeting";

export function MeetingList({ initialMeetings }: { initialMeetings: MeetingMetadata[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetings, setMeetings] = useState(initialMeetings);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function createNewMeeting(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as {
        error?: string;
        meeting?: { metadata: MeetingMetadata };
      };
      if (!response.ok || !data.meeting) {
        throw new Error(data.error || "会議を作成できませんでした");
      }
      setMeetings((current) => [data.meeting!.metadata, ...current]);
      router.push(`/meetings/${data.meeting.metadata.id}`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="stack-lg">
      <form className="new-meeting-card" onSubmit={createNewMeeting}>
        <div>
          <p className="eyebrow">NEW MEETING</p>
          <h2>新しい会議を開始</h2>
          <p className="muted">会議データはこのコンピューター内だけに保存されます。</p>
        </div>
        <div className="form-row">
          <input
            aria-label="会議タイトル"
            placeholder="例：研究定例ミーティング"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button className="primary" disabled={creating} type="submit">
            {creating ? "作成中..." : "会議を開始"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>過去の会議</h2>
          </div>
          <span className="count-badge">{meetings.length}件</span>
        </div>
        {meetings.length === 0 ? (
          <div className="empty-state">まだ会議はありません。最初の会議を開始してください。</div>
        ) : (
          <div className="meeting-grid">
            {meetings.map((meeting) => (
              <button
                className="meeting-card"
                key={meeting.id}
                onClick={() => router.push(`/meetings/${meeting.id}`)}
                type="button"
              >
                <span className="status-dot" />
                <strong>{meeting.title}</strong>
                <span>{new Date(meeting.startedAt).toLocaleString("ja-JP")}</span>
                <code>{meeting.id}</code>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
