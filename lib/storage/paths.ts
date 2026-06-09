import os from "node:os";
import path from "node:path";

const MEETING_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function dataRoot(): string {
  return path.resolve(
    process.env.MEETNOTE_DATA_DIR || path.join(os.homedir(), "MeetNote", "data"),
  );
}

export function meetingsRoot(): string {
  return path.join(dataRoot(), "meetings");
}

export function validateMeetingId(value: unknown): string {
  const meetingId = String(value ?? "").trim();
  if (!MEETING_ID_PATTERN.test(meetingId)) {
    throw new Error("会議IDが不正です");
  }
  return meetingId;
}

export function meetingDirectory(meetingId: unknown): string {
  const safeId = validateMeetingId(meetingId);
  const root = meetingsRoot();
  const target = path.resolve(root, safeId);

  if (path.dirname(target) !== path.resolve(root)) {
    throw new Error("会議パスが不正です");
  }
  return target;
}

export function relativeMeetingPath(absolutePath: string): string {
  return path.relative(dataRoot(), absolutePath);
}
