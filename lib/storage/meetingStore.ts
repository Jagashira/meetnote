import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ManualNote,
  MeetingMetadata,
  MeetingRecord,
  TranscriptItem,
} from "@/types/meeting";
import { meetingDirectory, meetingsRoot, relativeMeetingPath, validateMeetingId } from "./paths";
import { nowIso, timestampForFile } from "@/lib/utils/time";
import { slugify } from "@/lib/utils/slug";
import { convertWebmToQuickTimeMp4 } from "@/lib/screen/convert";

const writeQueues = new Map<string, Promise<unknown>>();

async function ensureMeetingDirectories(meetingId: string): Promise<string> {
  const directory = meetingDirectory(meetingId);
  await Promise.all([
    fs.mkdir(path.join(directory, "audio"), { recursive: true }),
    fs.mkdir(path.join(directory, "video"), { recursive: true }),
    fs.mkdir(path.join(directory, "screenshots"), { recursive: true }),
  ]);
  return directory;
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

function queueWrite<T>(meetingId: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(meetingId) ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const queued = current.finally(() => {
    if (writeQueues.get(meetingId) === queued) {
      writeQueues.delete(meetingId);
    }
  });
  writeQueues.set(meetingId, queued);
  return current;
}

export async function createMeeting(title?: string): Promise<MeetingRecord> {
  const startedAt = nowIso();
  const normalizedTitle = title?.trim() || "無題の会議";
  const id = `${startedAt.slice(0, 10).replaceAll("-", "")}_${slugify(normalizedTitle)}_${randomUUID().slice(0, 8)}`;
  const directory = await ensureMeetingDirectories(id);
  const metadata: MeetingMetadata = { id, title: normalizedTitle, startedAt };

  await Promise.all([
    writeJson(path.join(directory, "metadata.json"), metadata),
    writeJson(path.join(directory, "transcript.json"), []),
    writeJson(path.join(directory, "manual_notes.json"), []),
  ]);

  return getMeeting(id);
}

export async function listMeetings(): Promise<MeetingMetadata[]> {
  const root = meetingsRoot();
  await fs.mkdir(root, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });
  const meetings = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        readJson<MeetingMetadata | null>(path.join(root, entry.name, "metadata.json"), null),
      ),
  );

  return meetings
    .filter((meeting): meeting is MeetingMetadata => Boolean(meeting))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => relativeMeetingPath(path.join(directory, entry.name)))
      .sort()
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function getMeeting(meetingId: string): Promise<MeetingRecord> {
  const safeId = validateMeetingId(meetingId);
  const directory = meetingDirectory(safeId);
  const metadata = await readJson<MeetingMetadata | null>(path.join(directory, "metadata.json"), null);
  if (!metadata) {
    throw new Error("会議が見つかりません");
  }

  const [transcript, manualNotes, summary, screenshots, recordings, audioFiles] = await Promise.all([
    readJson<TranscriptItem[]>(path.join(directory, "transcript.json"), []),
    readJson<ManualNote[]>(path.join(directory, "manual_notes.json"), []),
    fs.readFile(path.join(directory, "summary.md"), "utf8").catch(() => ""),
    listFiles(path.join(directory, "screenshots")),
    listFiles(path.join(directory, "video")).then((files) =>
      files.filter((file) => file.endsWith(".webm")),
    ),
    listFiles(path.join(directory, "audio")),
  ]);

  return { metadata, transcript, manualNotes, summary, screenshots, recordings, audioFiles };
}

export async function appendTranscript(
  meetingId: string,
  input: Omit<TranscriptItem, "id" | "timestamp"> & Partial<Pick<TranscriptItem, "id" | "timestamp">>,
): Promise<TranscriptItem> {
  const safeId = validateMeetingId(meetingId);
  const item: TranscriptItem = {
    id: input.id || randomUUID(),
    timestamp: input.timestamp || nowIso(),
    speaker: input.speaker,
    text: input.text.trim(),
    source: input.source,
    confidence: input.confidence,
  };
  if (!item.text) {
    throw new Error("文字起こしテキストが空です");
  }

  return queueWrite(safeId, async () => {
    const directory = await ensureMeetingDirectories(safeId);
    const filePath = path.join(directory, "transcript.json");
    const transcript = await readJson<TranscriptItem[]>(filePath, []);
    transcript.push(item);
    await writeJson(filePath, transcript);
    return item;
  });
}

export async function appendManualNote(meetingId: string, text: string): Promise<ManualNote> {
  const safeId = validateMeetingId(meetingId);
  const note: ManualNote = { id: randomUUID(), timestamp: nowIso(), text: text.trim() };
  if (!note.text) {
    throw new Error("メモが空です");
  }

  return queueWrite(safeId, async () => {
    const directory = await ensureMeetingDirectories(safeId);
    const filePath = path.join(directory, "manual_notes.json");
    const notes = await readJson<ManualNote[]>(filePath, []);
    notes.push(note);
    await writeJson(filePath, notes);
    return note;
  });
}

export async function saveSummary(meetingId: string, markdown: string): Promise<void> {
  const directory = await ensureMeetingDirectories(validateMeetingId(meetingId));
  await fs.writeFile(path.join(directory, "summary.md"), markdown.trimEnd() + "\n", "utf8");
}

export async function saveScreenshot(meetingId: string, bytes: Buffer): Promise<string> {
  const directory = await ensureMeetingDirectories(validateMeetingId(meetingId));
  const filePath = path.join(directory, "screenshots", `${timestampForFile()}.png`);
  await fs.writeFile(filePath, bytes);
  return relativeMeetingPath(filePath);
}

export async function saveRecording(
  meetingId: string,
  bytes: Buffer,
  kind: "screen" | "audio",
): Promise<{ file: string; compatibilityFile?: string; warning?: string }> {
  const directory = await ensureMeetingDirectories(validateMeetingId(meetingId));
  const folder = kind === "audio" ? "audio" : "video";
  const basename = kind === "audio" ? "meeting_audio" : "screen_recording";
  const timestamp = timestampForFile();
  const filePath = path.join(directory, folder, `${basename}_${timestamp}.webm`);
  await fs.writeFile(filePath, bytes);

  if (kind === "audio") {
    return { file: relativeMeetingPath(filePath) };
  }

  const mp4Path = path.join(directory, folder, `${basename}_${timestamp}.mp4`);
  const conversion = await convertWebmToQuickTimeMp4(filePath, mp4Path);
  return {
    file: relativeMeetingPath(filePath),
    compatibilityFile: conversion.converted ? relativeMeetingPath(mp4Path) : undefined,
    warning: conversion.warning,
  };
}
