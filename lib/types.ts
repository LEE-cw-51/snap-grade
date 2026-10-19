export type FormRuleMode = "TRIANGLE" | "WRONG";

export type FormRules = Record<string, FormRuleMode>;

export type AutoVerdict = "O" | "TRI" | "X" | "CHECK";
export type FinalVerdict = "O" | "TRI" | "X";
export type SubmissionStatus =
  | "uploaded"
  | "grading"
  | "done"
  | "needs_review"
  | "failed";

export type Student = {
  id: string;
  teacherId: string;
  name: string;
  className: string;
  createdAt: string;
};

export type Worksheet = {
  id: string;
  teacherId: string;
  title: string;
  sectionLabel: string;
  gradeLevel: string | null;
  formRules: FormRules;
  createdAt: string;
};

export type AnswerItem = {
  id: string;
  worksheetId: string;
  number: string;
  answerLatex: string;
  answerType: string;
  itemFormRules: FormRules | null;
  keyErrorFlag: boolean;
};

export type Submission = {
  id: string;
  worksheetId: string;
  studentId: string;
  teacherId: string;
  photoPath: string | null;
  photoDataUrl: string | null;
  status: SubmissionStatus;
  photoDeleteAt: string | null;
  photoDeleteWarnedAt: string | null;
  createdAt: string;
};

export type ItemResult = {
  id: string;
  submissionId: string;
  number: string;
  studentAnswerLatex: string | null;
  studentAnswerRaw: string | null;
  readConfidence: number | null;
  aiEstimateLatex: string | null;
  computedAnswerLatex: string | null;
  autoVerdict: AutoVerdict;
  reasonCode: string | null;
  finalVerdict: FinalVerdict | null;
  resolvedAt: string | null;
};

export type GradingJob = {
  id: string;
  submissionId: string;
  teacherId: string;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export const FORM_PRESETS: Record<string, FormRules> = {
  DEFAULT: {
    NOT_REDUCED: "TRIANGLE",
    MIXED_IMPROPER: "TRIANGLE",
    FRACTION_DECIMAL: "TRIANGLE",
    RADICAL_NOT_SIMPLIFIED: "TRIANGLE",
    NOT_RATIONALIZED: "TRIANGLE",
    NOT_EXPANDED: "TRIANGLE",
    NOT_FACTORED: "TRIANGLE",
    UNIT_MISSING: "TRIANGLE",
    OTHER_FORM: "TRIANGLE",
  },
  ELEM_FRACTION: {
    NOT_REDUCED: "WRONG",
    MIXED_IMPROPER: "TRIANGLE",
    FRACTION_DECIMAL: "TRIANGLE",
    RADICAL_NOT_SIMPLIFIED: "TRIANGLE",
    NOT_RATIONALIZED: "TRIANGLE",
    NOT_EXPANDED: "TRIANGLE",
    NOT_FACTORED: "TRIANGLE",
    UNIT_MISSING: "TRIANGLE",
    OTHER_FORM: "TRIANGLE",
  },
  MIDDLE_RADICAL: {
    NOT_REDUCED: "TRIANGLE",
    MIXED_IMPROPER: "TRIANGLE",
    FRACTION_DECIMAL: "TRIANGLE",
    RADICAL_NOT_SIMPLIFIED: "WRONG",
    NOT_RATIONALIZED: "WRONG",
    NOT_EXPANDED: "TRIANGLE",
    NOT_FACTORED: "TRIANGLE",
    UNIT_MISSING: "TRIANGLE",
    OTHER_FORM: "TRIANGLE",
  },
  EXPAND_FACTOR: {
    NOT_REDUCED: "TRIANGLE",
    MIXED_IMPROPER: "TRIANGLE",
    FRACTION_DECIMAL: "TRIANGLE",
    RADICAL_NOT_SIMPLIFIED: "TRIANGLE",
    NOT_RATIONALIZED: "TRIANGLE",
    NOT_EXPANDED: "WRONG",
    NOT_FACTORED: "WRONG",
    UNIT_MISSING: "TRIANGLE",
    OTHER_FORM: "TRIANGLE",
  },
};

export const REASON_LABELS: Record<string, string> = {
  NOT_REDUCED: "약분 안 함",
  MIXED_IMPROPER: "대분수/가분수 형태 다름",
  FRACTION_DECIMAL: "분수/소수 형태 다름",
  RADICAL_NOT_SIMPLIFIED: "근호 미정리",
  NOT_RATIONALIZED: "유리화 안 함",
  NOT_EXPANDED: "전개 안 함",
  NOT_FACTORED: "인수분해 안 함",
  UNIT_MISSING: "단위 누락",
  OTHER_FORM: "기타 형태 다름",
};
