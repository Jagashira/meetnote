import { NextResponse } from "next/server";
import { saveScreenshot } from "@/lib/storage/meetingStore";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      throw new Error("スクリーンショットが送信されていません");
    }
    if (image.type !== "image/png") {
      throw new Error("スクリーンショットはPNG形式で送信してください");
    }
    const file = await saveScreenshot(id, Buffer.from(await image.arrayBuffer()));
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
