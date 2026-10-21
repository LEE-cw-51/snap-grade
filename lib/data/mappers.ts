import type {
  AnswerItem,
  FormRules,
  GradingJob,
  ItemResult,
  Student,
  Submission,
  Worksheet,
} from "@/lib/types";

export function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    name: String(row.name),
    className: String(row.class_name ?? ""),
    createdAt: String(row.created_at),
  };
}

export function mapWorksheet(row: Record<string, unknown>): Worksheet {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    title: String(row.title),
    sectionLabel: String(row.section_label ?? ""),
    gradeLevel: (row.grade_level as string | null) ?? null,
    formRules: (row.form_rules as FormRules) || {},
    createdAt: String(row.created_at),
  };
}

export function mapAnswerItem(row: Record<string, unknown>): AnswerItem {
  return {
    id: String(row.id),
    worksheetId: String(row.worksheet_id),
    number: String(row.number),
    answerLatex: String(row.answer_latex),
    answerType: String(row.answer_type ?? "expression"),
    itemFormRules: (row.item_form_rules as FormRules | null) ?? null,
    keyErrorFlag: Boolean(row.key_error_flag),
  };
}

export function mapSubmission(
  row: Record<string, unknown>,
  photoDataUrl: string | null = null,
): Submission {
  return {
    id: String(row.id),
    worksheetId: String(row.worksheet_id),
    studentId: String(row.student_id),
    teacherId: String(row.teacher_id),
    photoPath: (row.photo_path as string | null) ?? null,
    photoDataUrl,
    status: row.status as Submission["status"],
    photoDeleteAt: (row.photo_delete_at as string | null) ?? null,
    photoDeleteWarnedAt: (row.photo_delete_warned_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapItemResult(row: Record<string, unknown>): ItemResult {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    number: String(row.number),
    studentAnswerLatex: (row.student_answer_latex as string | null) ?? null,
    studentAnswerRaw: (row.student_answer_raw as string | null) ?? null,
    readConfidence: (row.read_confidence as number | null) ?? null,
    aiEstimateLatex: (row.ai_estimate_latex as string | null) ?? null,
    computedAnswerLatex: (row.computed_answer_latex as string | null) ?? null,
    autoVerdict: row.auto_verdict as ItemResult["autoVerdict"],
    reasonCode: (row.reason_code as string | null) ?? null,
    finalVerdict: (row.final_verdict as ItemResult["finalVerdict"]) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  };
}

export function mapJob(row: Record<string, unknown>): GradingJob {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    teacherId: String(row.teacher_id),
    status: row.status as GradingJob["status"],
    attempts: Number(row.attempts ?? 0),
    lastError: (row.last_error as string | null) ?? null,
    createdAt: String(row.created_at),
    startedAt: (row.started_at as string | null) ?? null,
    finishedAt: (row.finished_at as string | null) ?? null,
  };
}
