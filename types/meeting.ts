export type MeetingMetadata = {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  participants?: string[];
  tags?: string[];
};

export type TranscriptSource = "mic" | "system" | "mixed" | "manual";

export type TranscriptItem = {
  id: string;
  timestamp: string;
  speaker?: string;
  text: string;
  source: TranscriptSource;
  confidence?: number;
};

export type ManualNote = {
  id: string;
  timestamp: string;
  text: string;
};

export type MeetingSummary = {
  overview: string;
  discussionPoints: string[];
  decisions: string[];
  todos: TodoItem[];
  questions: QAItem[];
  nextActions: string[];
};

export type TodoItem = {
  task: string;
  owner?: string;
  dueDate?: string;
};

export type QAItem = {
  question: string;
  answer?: string;
  speaker?: string;
};

export type MeetingRecord = {
  metadata: MeetingMetadata;
  transcript: TranscriptItem[];
  manualNotes: ManualNote[];
  summary: string;
  screenshots: string[];
  recordings: string[];
  audioFiles: string[];
};
