/**
 * Smoke: mapper unit always runs; live Supabase ping only when configured.
 */
import assert from "node:assert/strict";

function mapWorksheet(row) {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    title: String(row.title),
    sectionLabel: String(row.section_label ?? ""),
    formRules: row.form_rules || {},
    createdAt: String(row.created_at),
  };
}

const mapped = mapWorksheet({
  id: "w1",
  teacher_id: "t1",
  title: "1일차",
  section_label: "1일차",
  form_rules: { NOT_REDUCED: "TRIANGLE" },
  created_at: "2026-01-01T00:00:00.000Z",
});
assert.equal(mapped.teacherId, "t1");
assert.equal(mapped.sectionLabel, "1일차");
console.log("mapper ok");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("supabase live smoke skipped (no URL/key — expected without Docker)");
  process.exit(0);
}

const res = await fetch(`${url}/rest/v1/worksheets?select=id&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});
if (!res.ok) {
  console.error("supabase ping failed", res.status, await res.text());
  process.exit(1);
}
console.log("supabase live smoke ok", res.status);
