import type { ManualNote, TranscriptItem } from "@/types/meeting";

const SUMMARY_STRUCTURE = `# 議事録

## 会議概要

## 主な議論

## 決定事項

## ToDo

## 質疑応答

## 未決事項

## 次回確認事項`;

function transcriptText(items: TranscriptItem[]): string {
  return items
    .map((item) => `[${item.timestamp}] [${item.speaker || item.source}] ${item.text}`)
    .join("\n");
}

function notesText(notes: ManualNote[]): string {
  return notes.map((note) => `[${note.timestamp}] ${note.text}`).join("\n");
}

export async function generateSummary(
  transcript: TranscriptItem[],
  manualNotes: ManualNote[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEYが設定されていません");
  }

  const model = process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini";
  const prompt = `以下の文字起こしと手動メモから、日本語の議事録を作成してください。

必須ルール:
- 指定されたMarkdown見出しを必ず使用する
- 日付、数値、名前、決定事項を創作しない
- 不明な内容は「不明」と書く
- 決定事項と意見を分ける
- 情報がない節にも「不明」と書く

出力構造:
${SUMMARY_STRUCTURE}

文字起こし:
${transcriptText(transcript) || "不明"}

手動メモ:
${notesText(manualNotes) || "不明"}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: prompt }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI APIエラー (${response.status})`);
  }

  const text =
    data.output_text ||
    data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ||
    "";
  if (!text.trim()) {
    throw new Error("要約結果が空でした");
  }
  return text.trim();
}
