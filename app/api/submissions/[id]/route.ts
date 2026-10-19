import { NextResponse } from "next/server";
import {
  getItemResults,
  getJobForSubmission,
  getSubmission,
  getWorksheet,
  listStudents,
} from "@/lib/data/memory-store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const submission = getSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const results = getItemResults(id);
  const job = getJobForSubmission(id);
  const worksheet = getWorksheet(submission.worksheetId);
  const student = listStudents(submission.teacherId).find(
    (s) => s.id === submission.studentId,
  );
  return NextResponse.json({ submission, results, job, student, worksheet });
}
