"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingMetadata } from "@/types/meeting";
import { AppIcon } from "./AppIcon";

type SortOrder = "newest" | "oldest" | "title";

function dateGroupLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (difference === 0) return "今日";
  if (difference === 1) return "昨日";
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function MeetingList({ initialMeetings }: { initialMeetings: MeetingMetadata[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetings, setMeetings] = useState(initialMeetings);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const visibleMeetings = meetings
    .filter((meeting) => meeting.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((left, right) => {
      if (sortOrder === "title") return left.title.localeCompare(right.title, "ja");
      const difference = new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();
      return sortOrder === "newest" ? difference : -difference;
    });

  const groupedMeetings = visibleMeetings.reduce<Array<{ label: string; meetings: MeetingMetadata[] }>>(
    (groups, meeting) => {
      const label = dateGroupLabel(meeting.startedAt);
      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.meetings.push(meeting);
      } else {
        groups.push({ label, meetings: [meeting] });
      }
      return groups;
    },
    [],
  );

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
    <div className="meeting-dashboard-grid">
      <section className="meeting-history-panel">
        <div className="meeting-history-heading">
          <div>
            <h2>最近の会議</h2>
            <p>{meetings.length}件の会議が保存されています</p>
          </div>
          <span className="count-badge">{visibleMeetings.length}件</span>
        </div>
        <div className="meeting-list-tools">
          <label className="meeting-search">
            <AppIcon name="search" size={18} />
            <input
              aria-label="会議を検索"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="会議名を検索"
              type="search"
              value={query}
            />
          </label>
          <select
            aria-label="会議の並び順"
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            value={sortOrder}
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="title">タイトル順</option>
          </select>
        </div>

        {visibleMeetings.length === 0 ? (
          <div className="empty-state meeting-list-empty">
            <AppIcon name="search" size={42} strokeWidth={1.4} />
            <span>{meetings.length === 0 ? "まだ会議はありません。" : "条件に一致する会議はありません。"}</span>
          </div>
        ) : (
          <div className="meeting-groups">
            {groupedMeetings.map((group) => (
              <section className="meeting-group" key={group.label}>
                <h3>{group.label}</h3>
                <div className="meeting-list">
                  {group.meetings.map((meeting) => {
                    const startedAt = new Date(meeting.startedAt);
                    return (
                      <button
                        className="meeting-list-item"
                        key={meeting.id}
                        onClick={() => router.push(`/meetings/${meeting.id}`)}
                        type="button"
                      >
                        <span className="meeting-date-tile">
                          <strong>{startedAt.getDate()}</strong>
                          <small>{startedAt.toLocaleDateString("ja-JP", { weekday: "short" })}</small>
                        </span>
                        <span className="meeting-list-copy">
                          <strong>{meeting.title}</strong>
                          <small>
                            {startedAt.toLocaleString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                          <code>{meeting.id}</code>
                        </span>
                        <span className="meeting-row-action"><AppIcon name="arrow-right" size={18} /></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <aside className="new-meeting-column">
        <form className="new-meeting-card" onSubmit={createNewMeeting}>
          <div className="new-meeting-icon"><AppIcon name="plus" size={24} /></div>
          <div>
            <p className="eyebrow">NEW MEETING</p>
            <h2>新しい会議</h2>
            <p className="muted">タイトルを入力して、記録用のワークスペースを開きます。</p>
          </div>
          <label className="new-meeting-field">
            <span>会議タイトル</span>
            <input
              aria-label="会議タイトル"
              placeholder="例：研究定例ミーティング"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button className="primary" disabled={creating || !title.trim()} type="submit">
            <AppIcon name="plus" size={18} />
            {creating ? "作成中..." : "会議を開始"}
          </button>
          {error && <p className="error">{error}</p>}
          <p className="local-note"><span className="status-dot" />会議データはこのコンピューター内だけに保存されます。</p>
        </form>
      </aside>
    </div>
  );
}
