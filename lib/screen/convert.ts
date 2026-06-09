import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function convertWebmToQuickTimeMp4(
  webmPath: string,
  mp4Path: string,
): Promise<{ converted: boolean; warning?: string }> {
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-i",
        webmPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        mp4Path,
      ],
      { timeout: 10 * 60 * 1000 },
    );
    return { converted: true };
  } catch (error) {
    const processError = error as NodeJS.ErrnoException & { stderr?: string };
    const unavailable = processError.code === "ENOENT";
    return {
      converted: false,
      warning: unavailable
        ? "ffmpegが見つからないため、QuickTime用MP4を生成できませんでした"
        : `QuickTime用MP4の生成に失敗しました: ${processError.stderr?.trim() || processError.message}`,
    };
  }
}
