import { NextResponse } from "next/server";
import { sweepPhotoLifecycle } from "@/lib/data/memory-store";

/** Memory-mode stand-in for daily photo deletion cron. */
export async function POST(req: Request) {
  let now = new Date();
  try {
    const body = await req.json();
    if (body?.now) now = new Date(body.now);
  } catch {
    // empty body ok
  }
  const result = sweepPhotoLifecycle(now);
  return NextResponse.json({ ok: true, ...result });
}
