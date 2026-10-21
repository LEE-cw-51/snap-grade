import { NextResponse } from "next/server";
import { sweepPhotoLifecycle } from "@/lib/data/provider";
import { allowE2eOverrides, assertOpsSecret } from "@/lib/ops/auth";

export async function POST(req: Request) {
  const denied = assertOpsSecret(req);
  if (denied) return denied;

  let now = new Date();
  if (allowE2eOverrides()) {
    try {
      const body = await req.json();
      if (body?.now) now = new Date(body.now);
    } catch {
      // empty body ok
    }
  }

  const result = await sweepPhotoLifecycle(now);
  return NextResponse.json({ ok: true, ...result });
}
