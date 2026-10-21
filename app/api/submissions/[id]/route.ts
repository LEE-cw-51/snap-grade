import { NextResponse } from "next/server";
import {
  getItemResults,
  getJobForSubmission,
  getSubmission,
  getWorksheet,
  listStudents,
} from "@/lib/data/provider";
import { assertDemoApiSecret } from "@/lib/ops/auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const submission = await getSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const results = await getItemResults(id);
  const job = await getJobForSubmission(id);
  const worksheet = await getWorksheet(submission.worksheetId);
  const student = (await listStudents(submission.teacherId)).find(
    (s) => s.id === submission.studentId,
  );
  return NextResponse.json({ submission, results, job, student, worksheet });
}
