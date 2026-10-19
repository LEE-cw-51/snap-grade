import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  countTodaySubmissions,
  createSubmission,
  demoTeacherId,
  findActiveSubmission,
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
  const maxPages = Number(process.env.MAX_PAGES_PER_SUBMISSION || "2");
  const teacherId = demoTeacherId();
  const body = await req.json();
  const { worksheetId, studentId, photoDataUrl, pageCount = 1 } = body as {
    worksheetId: string;
    studentId: string;
    photoDataUrl: string;
    pageCount?: number;
  };
  if (!worksheetId || !studentId || !photoDataUrl) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const pages = Number(pageCount) || 1;
  if (pages > maxPages) {
    return NextResponse.json(
      {
        error: "page_limit",
        message: `한 제출당 최대 ${maxPages}장까지입니다.`,
        maxPages,
      },
      { status: 400 },
    );
  }

  if (countTodaySubmissions(teacherId) >= daily) {
    return NextResponse.json(
      {
        error: "daily_limit",
        message: "오늘 채점 한도에 도달했습니다. 내일 다시 시도하세요.",
        limit: daily,
      },
      { status: 429 },
    );
  }

  if (findActiveSubmission(worksheetId, studentId)) {
    return NextResponse.json(
      {
        error: "already_grading",
        message: "이 학생은 아직 채점 중입니다. 완료 후 다시 올려 주세요.",
      },
      { status: 409 },
    );
  }

  const { submission, job } = createSubmission({
    teacherId,
    worksheetId,
    studentId,
    photoDataUrl,
  });

  after(async () => {
    await runGradingJob(submission.id);
  });

  return NextResponse.json({ submission, job });
}
