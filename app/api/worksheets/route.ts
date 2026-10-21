import { NextResponse } from "next/server";
import { demoTeacherId, listWorksheets } from "@/lib/data/provider";
import { assertDemoApiSecret } from "@/lib/ops/auth";

export async function GET(req: Request) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

  const teacherId = await demoTeacherId();
  return NextResponse.json({ worksheets: await listWorksheets(teacherId) });
}
