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

const DEMO_TEACHER = "demo-teacher";

type Store = {
  students: Student[];
  worksheets: Worksheet[];
  answerItems: AnswerItem[];
  submissions: Submission[];
  itemResults: ItemResult[];
  gradingJobs: GradingJob[];
  photos: Map<string, string>; // path -> dataUrl
};

declare global {
  var __snapMemoryStore: Store | undefined;
}

function store(): Store {
  if (!globalThis.__snapMemoryStore) {
    globalThis.__snapMemoryStore = {
      students: [
        {
          id: "stu-1",
          teacherId: DEMO_TEACHER,
          name: "김민수",
          className: "초4-A",
          createdAt: new Date().toISOString(),
        },
        {
          id: "stu-2",
          teacherId: DEMO_TEACHER,
          name: "이서연",
          className: "초4-A",
          createdAt: new Date().toISOString(),
        },
      ],
      worksheets: [],
      answerItems: [],
      submissions: [],
      itemResults: [],
      gradingJobs: [],
      photos: new Map(),
    };
  }
  return globalThis.__snapMemoryStore;
}

export function demoTeacherId() {
  return DEMO_TEACHER;
}

export function listWorksheets(teacherId: string) {
  return store()
    .worksheets.filter((w) => w.teacherId === teacherId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listStudents(teacherId: string) {
  return store().students.filter((s) => s.teacherId === teacherId);
}

export function getWorksheet(id: string) {
  return store().worksheets.find((w) => w.id === id) ?? null;
}

export function getAnswerItems(worksheetId: string) {
  return store().answerItems.filter((a) => a.worksheetId === worksheetId);
}

export function createWorksheet(input: {
  teacherId: string;
  title: string;
  sectionLabel: string;
  formRules?: FormRules;
  items: { number: string; answerLatex: string }[];
}) {
  const ws: Worksheet = {
    id: randomUUID(),
    teacherId: input.teacherId,
    title: input.title,
    sectionLabel: input.sectionLabel,
    gradeLevel: null,
    formRules: input.formRules ?? FORM_PRESETS.DEFAULT,
    createdAt: new Date().toISOString(),
  };
  store().worksheets.push(ws);
  for (const item of input.items) {
    store().answerItems.push({
      id: randomUUID(),
      worksheetId: ws.id,
      number: item.number,
      answerLatex: item.answerLatex,
      answerType: "expression",
      itemFormRules: null,
      keyErrorFlag: false,
    });
  }
  return ws;
}

export function addStudent(teacherId: string, name: string, className: string) {
  const s: Student = {
    id: randomUUID(),
    teacherId,
    name,
    className,
    createdAt: new Date().toISOString(),
  };
  store().students.push(s);
  return s;
}

export function createSubmission(input: {
  teacherId: string;
  worksheetId: string;
  studentId: string;
  photoDataUrl: string;
}) {
  const id = randomUUID();
  const path = `homework/${input.teacherId}/${id}.jpg`;
  store().photos.set(path, input.photoDataUrl);
  const sub: Submission = {
    id,
    worksheetId: input.worksheetId,
    studentId: input.studentId,
    teacherId: input.teacherId,
    photoPath: path,
    photoDataUrl: input.photoDataUrl,
    status: "uploaded",
    photoDeleteAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    photoDeleteWarnedAt: null,
    createdAt: new Date().toISOString(),
  };
  store().submissions.push(sub);
  const job: GradingJob = {
    id: randomUUID(),
    submissionId: id,
    teacherId: input.teacherId,
    status: "queued",
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };
  store().gradingJobs.push(job);
  return { submission: sub, job };
}

export function getSubmission(id: string) {
  return store().submissions.find((s) => s.id === id) ?? null;
}

export function listSubmissionsForWorksheet(worksheetId: string) {
  return store().submissions.filter((s) => s.worksheetId === worksheetId);
}

export function countTodaySubmissions(teacherId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return store().submissions.filter(
    (s) => s.teacherId === teacherId && s.createdAt.startsWith(today),
  ).length;
}

/** Reject enqueue while the same student+worksheet is still grading. */
export function findActiveSubmission(
  worksheetId: string,
  studentId: string,
) {
  return (
    store().submissions.find(
      (s) =>
        s.worksheetId === worksheetId &&
        s.studentId === studentId &&
        (s.status === "uploaded" || s.status === "grading"),
    ) ?? null
  );
}

export function getJobForSubmission(submissionId: string) {
  return (
    store()
      .gradingJobs.filter((j) => j.submissionId === submissionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export function updateSubmission(id: string, patch: Partial<Submission>) {
  const s = getSubmission(id);
  if (!s) return null;
  Object.assign(s, patch);
  return s;
}

export function updateJob(id: string, patch: Partial<GradingJob>) {
  const j = store().gradingJobs.find((x) => x.id === id);
  if (!j) return null;
  Object.assign(j, patch);
  return j;
}

export function replaceItemResults(submissionId: string, results: ItemResult[]) {
  const st = store();
  st.itemResults = st.itemResults.filter((r) => r.submissionId !== submissionId);
  st.itemResults.push(...results);
}

export function getItemResults(submissionId: string) {
  return store().itemResults.filter((r) => r.submissionId === submissionId);
}

export function updateItemResult(id: string, patch: Partial<ItemResult>) {
  const r = store().itemResults.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, patch);
  return r;
}

export function deletePhoto(path: string | null) {
  if (!path) return;
  store().photos.delete(path);
}

export function getPhotoDataUrl(path: string | null) {
  if (!path) return null;
  return store().photos.get(path) ?? null;
}

export function flagKeyErrors(worksheetId: string) {
  const subs = listSubmissionsForWorksheet(worksheetId).filter((s) =>
    ["done", "needs_review"].includes(s.status),
  );
  if (subs.length < 3) return;
  const answers = getAnswerItems(worksheetId);
  for (const item of answers) {
    const computedCounts = new Map<string, number>();
    for (const sub of subs) {
      const r = getItemResults(sub.id).find((x) => x.number === item.number);
      if (r?.computedAnswerLatex) {
        computedCounts.set(
          r.computedAnswerLatex,
          (computedCounts.get(r.computedAnswerLatex) || 0) + 1,
        );
      }
    }
    for (const [val, count] of computedCounts) {
      const ratio = count / subs.length;
      if (count >= 3 || ratio >= 0.3) {
        if (val !== item.answerLatex) {
          item.keyErrorFlag = true;
        }
      }
    }
  }
}

export function listKeyErrorItems(worksheetId: string) {
  return getAnswerItems(worksheetId).filter((a) => a.keyErrorFlag);
}

export function updateAnswerItemLatex(
  itemId: string,
  answerLatex: string,
) {
  const item = store().answerItems.find((a) => a.id === itemId);
  if (!item) return null;
  item.answerLatex = answerLatex;
  item.keyErrorFlag = false;
  return item;
}

/** Mark 24h warning; extend +7d once if open ? remain; delete expired photos. */
export function sweepPhotoLifecycle(now = new Date()) {
  const warned: string[] = [];
  const extended: string[] = [];
  const deleted: string[] = [];
  const msDay = 24 * 3600 * 1000;

  for (const sub of store().submissions) {
    if (!sub.photoPath || !sub.photoDeleteAt) continue;
    const deleteAt = new Date(sub.photoDeleteAt).getTime();
    const openChecks = getItemResults(sub.id).filter(
      (r) => r.autoVerdict === "CHECK" && !r.finalVerdict,
    );

    if (now.getTime() >= deleteAt) {
      if (openChecks.length > 0 && !sub.photoDeleteWarnedAt) {
        // Should have warned first; still extend once rather than wipe open ?
        sub.photoDeleteAt = new Date(deleteAt + 7 * msDay).toISOString();
        sub.photoDeleteWarnedAt = now.toISOString();
        extended.push(sub.id);
        continue;
      }
      if (
        openChecks.length > 0 &&
        sub.photoDeleteWarnedAt &&
        deleteAt - new Date(sub.photoDeleteWarnedAt).getTime() < 8 * msDay
      ) {
        // Already extended once via warn path — allow delete to force re-shoot
      }
      deletePhoto(sub.photoPath);
      sub.photoPath = null;
      sub.photoDataUrl = null;
      deleted.push(sub.id);
      continue;
    }

    if (
      !sub.photoDeleteWarnedAt &&
      deleteAt - now.getTime() <= msDay
    ) {
      sub.photoDeleteWarnedAt = now.toISOString();
      warned.push(sub.id);
      if (openChecks.length > 0) {
        sub.photoDeleteAt = new Date(deleteAt + 7 * msDay).toISOString();
        extended.push(sub.id);
      }
    }
  }

  return { warned, extended, deleted };
}

/** Test helper: force photo_delete_at into the past/near future. */
export function setPhotoDeleteAt(submissionId: string, iso: string) {
  const s = getSubmission(submissionId);
  if (!s) return null;
  s.photoDeleteAt = iso;
  return s;
}

export function listSubmissionsForTeacher(teacherId: string) {
  return store().submissions.filter((s) => s.teacherId === teacherId);
}

export function enqueueRegrade(submissionId: string) {
  const sub = getSubmission(submissionId);
  if (!sub) return null;
  const job: GradingJob = {
    id: randomUUID(),
    submissionId,
    teacherId: sub.teacherId,
    status: "queued",
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };
  store().gradingJobs.push(job);
  updateSubmission(submissionId, { status: "uploaded" });
  return job;
}
