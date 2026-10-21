import { randomUUID } from "node:crypto";
import type {
  AnswerItem,
  FormRules,
  GradingJob,
  ItemResult,
  Student,
  Submission,
  Worksheet,
} from "@/lib/types";
import { FORM_PRESETS } from "@/lib/types";
import { getServiceClient } from "@/lib/supabase/admin";
import {
  mapAnswerItem,
  mapJob,
  mapItemResult,
  mapStudent,
  mapSubmission,
  mapWorksheet,
} from "./mappers";

const BUCKET = "homework-photos";

/** Fixed local demo teacher — create via seed / Auth (see docs/local-supabase.md). */
export function demoTeacherId() {
  return (
    process.env.DEMO_TEACHER_ID ||
    "00000000-0000-4000-8000-000000000001"
  );
}

async function signedPhoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  const sb = getServiceClient();
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 15);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function uploadPhoto(path: string, dataUrl: string) {
  const sb = getServiceClient();
  const base64 = dataUrl.split(",")[1] || "";
  const bytes = Buffer.from(base64, "base64");
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
}

export async function listWorksheets(teacherId: string): Promise<Worksheet[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("worksheets")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => mapWorksheet(r));
}

export async function listStudents(teacherId: string): Promise<Student[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("students")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => mapStudent(r));
}

export async function getWorksheet(id: string): Promise<Worksheet | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("worksheets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWorksheet(data) : null;
}

export async function getAnswerItems(
  worksheetId: string,
): Promise<AnswerItem[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("answer_items")
    .select("*")
    .eq("worksheet_id", worksheetId)
    .order("number", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => mapAnswerItem(r));
}

export async function createWorksheet(input: {
  teacherId: string;
  title: string;
  sectionLabel: string;
  formRules?: FormRules;
  items: { number: string; answerLatex: string }[];
}): Promise<Worksheet> {
  const sb = getServiceClient();
  const { data: ws, error } = await sb
    .from("worksheets")
    .insert({
      teacher_id: input.teacherId,
      title: input.title,
      section_label: input.sectionLabel,
      form_rules: input.formRules ?? FORM_PRESETS.DEFAULT,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (input.items.length) {
    const { error: itemErr } = await sb.from("answer_items").insert(
      input.items.map((i) => ({
        worksheet_id: ws.id,
        number: i.number,
        answer_latex: i.answerLatex,
      })),
    );
    if (itemErr) throw itemErr;
  }
  return mapWorksheet(ws);
}

export async function addStudent(
  teacherId: string,
  name: string,
  className: string,
): Promise<Student> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("students")
    .insert({
      teacher_id: teacherId,
      name,
      class_name: className,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapStudent(data);
}

export async function createSubmission(input: {
  teacherId: string;
  worksheetId: string;
  studentId: string;
  photoDataUrl: string;
}): Promise<{ submission: Submission; job: GradingJob }> {
  const sb = getServiceClient();
  const id = randomUUID();
  const path = `homework/${input.teacherId}/${id}.jpg`;
  await uploadPhoto(path, input.photoDataUrl);

  const { data: sub, error } = await sb
    .from("submissions")
    .insert({
      id,
      worksheet_id: input.worksheetId,
      student_id: input.studentId,
      teacher_id: input.teacherId,
      photo_path: path,
      status: "uploaded",
      photo_delete_at: new Date(
        Date.now() + 7 * 24 * 3600 * 1000,
      ).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: job, error: jobErr } = await sb
    .from("grading_jobs")
    .insert({
      submission_id: id,
      teacher_id: input.teacherId,
      status: "queued",
      attempts: 0,
    })
    .select("*")
    .single();
  if (jobErr) throw jobErr;

  return {
    submission: mapSubmission(sub, input.photoDataUrl),
    job: mapJob(job),
  };
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const url = await signedPhoto(data.photo_path);
  return mapSubmission(data, url);
}

export async function listSubmissionsForWorksheet(
  worksheetId: string,
): Promise<Submission[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("worksheet_id", worksheetId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => mapSubmission(r, null));
}

export async function countTodaySubmissions(
  teacherId: string,
): Promise<number> {
  const sb = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await sb
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .gte("created_at", `${today}T00:00:00.000Z`);
  if (error) throw error;
  return count ?? 0;
}

export async function findActiveSubmission(
  worksheetId: string,
  studentId: string,
): Promise<Submission | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("worksheet_id", worksheetId)
    .eq("student_id", studentId)
    .in("status", ["uploaded", "grading"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  return row ? mapSubmission(row, null) : null;
}

export async function getJobForSubmission(
  submissionId: string,
): Promise<GradingJob | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("grading_jobs")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapJob(data) : null;
}

export async function updateSubmission(
  id: string,
  patch: Partial<Submission>,
): Promise<Submission | null> {
  const sb = getServiceClient();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.photoPath !== undefined) row.photo_path = patch.photoPath;
  if (patch.photoDeleteAt !== undefined) {
    row.photo_delete_at = patch.photoDeleteAt;
  }
  if (patch.photoDeleteWarnedAt !== undefined) {
    row.photo_delete_warned_at = patch.photoDeleteWarnedAt;
  }
  const { data, error } = await sb
    .from("submissions")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapSubmission(data, patch.photoDataUrl ?? null) : null;
}

export async function updateJob(
  id: string,
  patch: Partial<GradingJob>,
): Promise<GradingJob | null> {
  const sb = getServiceClient();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.attempts !== undefined) row.attempts = patch.attempts;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt;
  const { data, error } = await sb
    .from("grading_jobs")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapJob(data) : null;
}

export async function replaceItemResults(
  submissionId: string,
  results: ItemResult[],
): Promise<void> {
  const sb = getServiceClient();
  await sb.from("item_results").delete().eq("submission_id", submissionId);
  if (!results.length) return;
  const { error } = await sb.from("item_results").insert(
    results.map((r) => ({
      id: r.id,
      submission_id: submissionId,
      number: r.number,
      student_answer_latex: r.studentAnswerLatex,
      student_answer_raw: r.studentAnswerRaw,
      read_confidence: r.readConfidence,
      ai_estimate_latex: r.aiEstimateLatex,
      computed_answer_latex: r.computedAnswerLatex,
      auto_verdict: r.autoVerdict,
      reason_code: r.reasonCode,
      final_verdict: r.finalVerdict,
      resolved_at: r.resolvedAt,
    })),
  );
  if (error) throw error;
}

export async function getItemResults(
  submissionId: string,
): Promise<ItemResult[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("item_results")
    .select("*")
    .eq("submission_id", submissionId)
    .order("number", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => mapItemResult(r));
}

export async function updateItemResult(
  id: string,
  patch: Partial<ItemResult>,
): Promise<ItemResult | null> {
  const sb = getServiceClient();
  const row: Record<string, unknown> = {};
  if (patch.finalVerdict !== undefined) row.final_verdict = patch.finalVerdict;
  if (patch.resolvedAt !== undefined) row.resolved_at = patch.resolvedAt;
  if (patch.autoVerdict !== undefined) row.auto_verdict = patch.autoVerdict;
  if (patch.reasonCode !== undefined) row.reason_code = patch.reasonCode;
  const { data, error } = await sb
    .from("item_results")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapItemResult(data) : null;
}

export async function deletePhoto(path: string | null): Promise<void> {
  if (!path) return;
  const sb = getServiceClient();
  await sb.storage.from(BUCKET).remove([path]);
}

export async function getPhotoDataUrl(
  path: string | null,
): Promise<string | null> {
  return signedPhoto(path);
}

export async function flagKeyErrors(worksheetId: string): Promise<void> {
  const subs = (await listSubmissionsForWorksheet(worksheetId)).filter((s) =>
    ["done", "needs_review"].includes(s.status),
  );
  if (subs.length < 3) return;
  const answers = await getAnswerItems(worksheetId);
  const sb = getServiceClient();
  for (const item of answers) {
    const computedCounts = new Map<string, number>();
    for (const sub of subs) {
      const results = await getItemResults(sub.id);
      const r = results.find((x) => x.number === item.number);
      if (r?.computedAnswerLatex) {
        computedCounts.set(
          r.computedAnswerLatex,
          (computedCounts.get(r.computedAnswerLatex) || 0) + 1,
        );
      }
    }
    for (const [val, count] of computedCounts) {
      const ratio = count / subs.length;
      if ((count >= 3 || ratio >= 0.3) && val !== item.answerLatex) {
        await sb
          .from("answer_items")
          .update({ key_error_flag: true })
          .eq("id", item.id);
      }
    }
  }
}

export async function listKeyErrorItems(
  worksheetId: string,
): Promise<AnswerItem[]> {
  const items = await getAnswerItems(worksheetId);
  return items.filter((a) => a.keyErrorFlag);
}

export async function updateAnswerItemLatex(
  itemId: string,
  answerLatex: string,
): Promise<AnswerItem | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("answer_items")
    .update({ answer_latex: answerLatex, key_error_flag: false })
    .eq("id", itemId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapAnswerItem(data) : null;
}

export async function sweepPhotoLifecycle(now = new Date()) {
  const sb = getServiceClient();
  const { data: subs, error } = await sb
    .from("submissions")
    .select("*")
    .not("photo_path", "is", null);
  if (error) throw error;

  const warned: string[] = [];
  const extended: string[] = [];
  const deleted: string[] = [];
  const msDay = 24 * 3600 * 1000;

  for (const raw of subs || []) {
    const sub = mapSubmission(raw, null);
    if (!sub.photoPath || !sub.photoDeleteAt) continue;
    const deleteAt = new Date(sub.photoDeleteAt).getTime();
    const openChecks = (await getItemResults(sub.id)).filter(
      (r) => r.autoVerdict === "CHECK" && !r.finalVerdict,
    );

    if (now.getTime() >= deleteAt) {
      if (openChecks.length > 0 && !sub.photoDeleteWarnedAt) {
        await updateSubmission(sub.id, {
          photoDeleteAt: new Date(deleteAt + 7 * msDay).toISOString(),
          photoDeleteWarnedAt: now.toISOString(),
        });
        extended.push(sub.id);
        continue;
      }
      await deletePhoto(sub.photoPath);
      await updateSubmission(sub.id, {
        photoPath: null,
        photoDataUrl: null,
      });
      deleted.push(sub.id);
      continue;
    }

    if (!sub.photoDeleteWarnedAt && deleteAt - now.getTime() <= msDay) {
      const patch: Partial<Submission> = {
        photoDeleteWarnedAt: now.toISOString(),
      };
      warned.push(sub.id);
      if (openChecks.length > 0) {
        patch.photoDeleteAt = new Date(deleteAt + 7 * msDay).toISOString();
        extended.push(sub.id);
      }
      await updateSubmission(sub.id, patch);
    }
  }

  return { warned, extended, deleted };
}

export async function enqueueRegrade(
  submissionId: string,
): Promise<GradingJob | null> {
  const sub = await getSubmission(submissionId);
  if (!sub) return null;
  if (sub.status === "uploaded" || sub.status === "grading") {
    return null;
  }
  const latest = await getJobForSubmission(submissionId);
  if (latest && (latest.status === "queued" || latest.status === "running")) {
    return null;
  }
  const sb = getServiceClient();
  const { data: job, error } = await sb
    .from("grading_jobs")
    .insert({
      submission_id: submissionId,
      teacher_id: sub.teacherId,
      status: "queued",
      attempts: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  await updateSubmission(submissionId, { status: "uploaded" });
  return mapJob(job);
}

export async function resetMemoryStore(): Promise<void> {
  throw new Error("reset not supported for supabase provider");
}

export async function listSubmissionsForTeacher(
  teacherId: string,
): Promise<Submission[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("teacher_id", teacherId);
  if (error) throw error;
  return (data || []).map((r) => mapSubmission(r, null));
}

export async function setPhotoDeleteAt(
  submissionId: string,
  iso: string,
): Promise<Submission | null> {
  return updateSubmission(submissionId, { photoDeleteAt: iso });
}
