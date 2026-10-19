import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  createSubmission,
  demoTeacherId,
  listSubmissionsForWorksheet,
} from "@/lib/data/memory-store";
import { runGradingJob } from "@/lib/grading/run-job";

export async function GET(req: Request) {
  const worksheetId = new URL(req.url).searchParams.get("worksheetId");
  if (!worksheetId) {
    return NextResponse.json({ error: "worksheetId required" }, { status: 400 });
  }
  return NextResponse.json({
    submissions: listSubmissionsForWorksheet(worksheetId),
  });
}

export async function POST(req: Request) {
  const daily = Number(process.env.DAILY_GRADE_LIMIT || "80");
  const body = await req.json();
  const { worksheetId, studentId, photoDataUrl } = body as {
    worksheetId: string;
    studentId: string;
    photoDataUrl: string;
  };
  if (!worksheetId || !studentId || !photoDataUrl) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Simple in-memory daily guard (demo)
  const today = new Date().toISOString().slice(0, 10);
  const count = listSubmissionsForWorksheet(worksheetId).filter((s) =>
    s.createdAt.startsWith(today),
  ).length;
  // Count all teacher submissions roughly via worksheet list is imperfect; ok for demo.
  if (count >= daily) {
    return NextResponse.json({ error: "daily limit" }, { status: 429 });
  }

  const { submission, job } = createSubmission({
    teacherId: demoTeacherId(),
    worksheetId,
    studentId,
    photoDataUrl,
  });

  after(async () => {
    await runGradingJob(submission.id);
  });

  return NextResponse.json({ submission, job });
}
