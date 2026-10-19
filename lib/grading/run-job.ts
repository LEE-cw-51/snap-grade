import { randomUUID } from "node:crypto";
import {
  deletePhoto,
  flagKeyErrors,
  getAnswerItems,
  getJobForSubmission,
  getSubmission,
  getWorksheet,
  replaceItemResults,
  updateJob,
  updateSubmission,
} from "@/lib/data/memory-store";
import { compareAnswers, computeFromProblem } from "@/lib/grader/client";
import type { AutoVerdict, ItemResult } from "@/lib/types";
import { getVisionReader } from "@/lib/vision";

const threshold = () =>
  Number(process.env.READ_CONFIDENCE_THRESHOLD || "0.8");

export async function runGradingJob(submissionId: string): Promise<void> {
  const submission = getSubmission(submissionId);
  const job = getJobForSubmission(submissionId);
  if (!submission || !job) return;

  if (job.attempts >= 2 && job.status === "failed") return;

  updateJob(job.id, {
    status: "running",
    attempts: job.attempts + 1,
    startedAt: new Date().toISOString(),
    lastError: null,
  });
  updateSubmission(submissionId, { status: "grading" });

  try {
    const worksheet = getWorksheet(submission.worksheetId);
    if (!worksheet) throw new Error("worksheet missing");
    const answers = getAnswerItems(worksheet.id);
    const answerMap = new Map(answers.map((a) => [a.number, a]));

    const vision = getVisionReader();
    const extracted = await vision.extractHomework(
      submission.photoDataUrl || "",
      "image/jpeg",
    );

    const results: ItemResult[] = [];
    let needsReview = false;

    for (const item of extracted.items) {
      const key = answerMap.get(item.number);
      let autoVerdict: AutoVerdict = "CHECK";
      let reasonCode: string | null = null;
      let computed: string | null = null;

      if (item.problem_latex) {
        computed = await computeFromProblem(item.problem_latex);
      }

      const lowConf =
        !item.legible || item.read_confidence < threshold();

      if (lowConf || !key) {
        autoVerdict = "CHECK";
        needsReview = true;
      } else {
        const cmp = await compareAnswers(
          item.student_answer_latex,
          key.answerLatex,
          { ...worksheet.formRules, ...(key.itemFormRules || {}) },
        );
        autoVerdict = cmp.verdict;
        reasonCode = cmp.reason_code;
      }

      let estimate = item.student_answer_latex;
      if (autoVerdict === "CHECK") {
        estimate =
          computed ||
          key?.answerLatex ||
          item.alternatives?.[0] ||
          item.student_answer_latex;
      }

      results.push({
        id: randomUUID(),
        submissionId,
        number: item.number,
        studentAnswerLatex: item.student_answer_latex,
        studentAnswerRaw: item.student_answer_raw,
        readConfidence: item.read_confidence,
        aiEstimateLatex: estimate,
        computedAnswerLatex: computed,
        autoVerdict,
        reasonCode,
        finalVerdict: null,
        resolvedAt: null,
      });
    }

    replaceItemResults(submissionId, results);
    updateSubmission(submissionId, {
      status: needsReview ? "needs_review" : "done",
    });
    updateJob(job.id, {
      status: "done",
      finishedAt: new Date().toISOString(),
    });

    if (!needsReview) {
      deletePhoto(submission.photoPath);
      updateSubmission(submissionId, { photoPath: null, photoDataUrl: null });
    }

    flagKeyErrors(submission.worksheetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(job.id, {
      status: "failed",
      lastError: message,
      finishedAt: new Date().toISOString(),
    });
    updateSubmission(submissionId, { status: "failed" });
  }
}
