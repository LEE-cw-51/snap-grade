import { randomUUID } from "node:crypto";
import {
  deletePhoto,
  flagKeyErrors,
  getAnswerItems,
  getJobForSubmission,
  getPhotoDataUrl,
  getSubmission,
  getWorksheet,
  replaceItemResults,
  updateJob,
  updateSubmission,
} from "@/lib/data/provider";
import { compareAnswers, computeFromProblem } from "@/lib/grader/client";
import type { AutoVerdict, ItemResult } from "@/lib/types";
import { getVisionReader } from "@/lib/vision";

const threshold = () =>
  Number(process.env.READ_CONFIDENCE_THRESHOLD || "0.8");

export async function runGradingJob(submissionId: string): Promise<void> {
  const submission = await getSubmission(submissionId);
  const job = await getJobForSubmission(submissionId);
  if (!submission || !job) return;

  if (job.attempts >= 2) return;

  await updateJob(job.id, {
    status: "running",
    attempts: job.attempts + 1,
    startedAt: new Date().toISOString(),
    lastError: null,
  });
  await updateSubmission(submissionId, { status: "grading" });

  try {
    const worksheet = await getWorksheet(submission.worksheetId);
    if (!worksheet) throw new Error("worksheet missing");
    const answers = await getAnswerItems(worksheet.id);
    const answerMap = new Map(answers.map((a) => [a.number, a]));

    const vision = getVisionReader();
    const photoUrl =
      submission.photoDataUrl ||
      (await getPhotoDataUrl(submission.photoPath)) ||
      "";
    const extracted = await vision.extractHomework(photoUrl, "image/jpeg");

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

    await replaceItemResults(submissionId, results);
    await updateSubmission(submissionId, {
      status: needsReview ? "needs_review" : "done",
    });
    await updateJob(job.id, {
      status: "done",
      finishedAt: new Date().toISOString(),
    });

    if (!needsReview) {
      await deletePhoto(submission.photoPath);
      await updateSubmission(submissionId, {
        photoPath: null,
        photoDataUrl: null,
      });
    }

    await flagKeyErrors(submission.worksheetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts =
      (await getJobForSubmission(submissionId))?.attempts ?? 1;
    if (attempts < 2) {
      await updateJob(job.id, {
        status: "queued",
        lastError: message,
      });
      await runGradingJob(submissionId);
      return;
    }
    await updateJob(job.id, {
      status: "failed",
      lastError: message,
      finishedAt: new Date().toISOString(),
    });
    await updateSubmission(submissionId, { status: "failed" });
  }
}
