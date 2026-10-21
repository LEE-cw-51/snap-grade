import { NextResponse } from "next/server";
import { demoTeacherId, listWorksheets } from "@/lib/data/provider";

export async function GET() {
  const teacherId = await demoTeacherId();
  return NextResponse.json({ worksheets: await listWorksheets(teacherId) });
}
