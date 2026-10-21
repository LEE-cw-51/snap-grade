/**
 * Data access facade: memory (default, $0) or supabase (local CLI / cloud).
 * All methods are async so call sites stay uniform.
 */
import * as memory from "./memory-store";
import * as supabase from "./supabase-store";

function useSupabase() {
  return (process.env.DATA_PROVIDER || "memory") === "supabase";
}

export function dataProviderName() {
  return useSupabase() ? "supabase" : "memory";
}

export async function demoTeacherId() {
  return useSupabase() ? supabase.demoTeacherId() : memory.demoTeacherId();
}

export async function listWorksheets(teacherId: string) {
  return useSupabase()
    ? supabase.listWorksheets(teacherId)
    : memory.listWorksheets(teacherId);
}

export async function listStudents(teacherId: string) {
  return useSupabase()
    ? supabase.listStudents(teacherId)
    : memory.listStudents(teacherId);
}

export async function getWorksheet(id: string) {
  return useSupabase()
    ? supabase.getWorksheet(id)
    : memory.getWorksheet(id);
}

export async function getAnswerItems(worksheetId: string) {
  return useSupabase()
    ? supabase.getAnswerItems(worksheetId)
    : memory.getAnswerItems(worksheetId);
}

export async function createWorksheet(
  input: Parameters<typeof memory.createWorksheet>[0],
) {
  return useSupabase()
    ? supabase.createWorksheet(input)
    : memory.createWorksheet(input);
}

export async function addStudent(
  teacherId: string,
  name: string,
  className: string,
) {
  return useSupabase()
    ? supabase.addStudent(teacherId, name, className)
    : memory.addStudent(teacherId, name, className);
}

export async function createSubmission(
  input: Parameters<typeof memory.createSubmission>[0],
) {
  return useSupabase()
    ? supabase.createSubmission(input)
    : memory.createSubmission(input);
}

export async function getSubmission(id: string) {
  return useSupabase()
    ? supabase.getSubmission(id)
    : memory.getSubmission(id);
}

export async function listSubmissionsForWorksheet(worksheetId: string) {
  return useSupabase()
    ? supabase.listSubmissionsForWorksheet(worksheetId)
    : memory.listSubmissionsForWorksheet(worksheetId);
}

export async function countTodaySubmissions(teacherId: string) {
  return useSupabase()
    ? supabase.countTodaySubmissions(teacherId)
    : memory.countTodaySubmissions(teacherId);
}

export async function findActiveSubmission(
  worksheetId: string,
  studentId: string,
) {
  return useSupabase()
    ? supabase.findActiveSubmission(worksheetId, studentId)
    : memory.findActiveSubmission(worksheetId, studentId);
}

export async function getJobForSubmission(submissionId: string) {
  return useSupabase()
    ? supabase.getJobForSubmission(submissionId)
    : memory.getJobForSubmission(submissionId);
}

export async function updateSubmission(
  id: string,
  patch: Parameters<typeof memory.updateSubmission>[1],
) {
  return useSupabase()
    ? supabase.updateSubmission(id, patch)
    : memory.updateSubmission(id, patch);
}

export async function updateJob(
  id: string,
  patch: Parameters<typeof memory.updateJob>[1],
) {
  return useSupabase()
    ? supabase.updateJob(id, patch)
    : memory.updateJob(id, patch);
}

export async function replaceItemResults(
  submissionId: string,
  results: Parameters<typeof memory.replaceItemResults>[1],
) {
  return useSupabase()
    ? supabase.replaceItemResults(submissionId, results)
    : memory.replaceItemResults(submissionId, results);
}

export async function getItemResults(submissionId: string) {
  return useSupabase()
    ? supabase.getItemResults(submissionId)
    : memory.getItemResults(submissionId);
}

export async function updateItemResult(
  id: string,
  patch: Parameters<typeof memory.updateItemResult>[1],
) {
  return useSupabase()
    ? supabase.updateItemResult(id, patch)
    : memory.updateItemResult(id, patch);
}

export async function deletePhoto(path: string | null) {
  return useSupabase()
    ? supabase.deletePhoto(path)
    : memory.deletePhoto(path);
}

export async function getPhotoDataUrl(path: string | null) {
  return useSupabase()
    ? supabase.getPhotoDataUrl(path)
    : memory.getPhotoDataUrl(path);
}

export async function flagKeyErrors(worksheetId: string) {
  return useSupabase()
    ? supabase.flagKeyErrors(worksheetId)
    : memory.flagKeyErrors(worksheetId);
}

export async function listKeyErrorItems(worksheetId: string) {
  return useSupabase()
    ? supabase.listKeyErrorItems(worksheetId)
    : memory.listKeyErrorItems(worksheetId);
}

export async function updateAnswerItemLatex(
  itemId: string,
  answerLatex: string,
) {
  return useSupabase()
    ? supabase.updateAnswerItemLatex(itemId, answerLatex)
    : memory.updateAnswerItemLatex(itemId, answerLatex);
}

export async function sweepPhotoLifecycle(now?: Date) {
  return useSupabase()
    ? supabase.sweepPhotoLifecycle(now)
    : memory.sweepPhotoLifecycle(now);
}

export async function enqueueRegrade(submissionId: string) {
  return useSupabase()
    ? supabase.enqueueRegrade(submissionId)
    : memory.enqueueRegrade(submissionId);
}

export async function resetStore() {
  if (useSupabase()) {
    throw new Error("reset only supported for memory provider");
  }
  memory.resetMemoryStore();
}
