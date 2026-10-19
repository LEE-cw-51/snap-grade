import { NextResponse } from "next/server";
import { getVisionReader } from "@/lib/vision";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const vision = getVisionReader();
  const result = await vision.extractAnswerKey(buf, file.type || "image/jpeg");
  return NextResponse.json(result);
}
