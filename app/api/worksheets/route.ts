import { NextResponse } from "next/server";
import { demoTeacherId, listWorksheets } from "@/lib/data/memory-store";

export async function GET() {
  const teacherId = demoTeacherId();
  return NextResponse.json({ worksheets: listWorksheets(teacherId) });
}
