"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Row = {
  submissionId: string;
  studentName: string;
  status: string;
  x: number;
  tri: number;
  check: number;
};

export default function ResultsPage() {
  const params = useParams<{ worksheetId: string }>();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function load() {
      const subsRes = await fetch(`/api/submissions?worksheetId=${params.worksheetId}`);
      const subsData = await subsRes.json();
      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      const studentMap = new Map(
        (studentsData.students || []).map((s: { id: string; name: string }) => [s.id, s.name]),
      );

      const next: Row[] = [];
      for (const sub of subsData.submissions || []) {
        const detail = await fetch(`/api/submissions/${sub.id}`).then((r) => r.json());
        const results = detail.results || [];
        const verdicts = results.map(
          (r: { finalVerdict: string | null; autoVerdict: string }) =>
            r.finalVerdict || r.autoVerdict,
        );
        next.push({
          submissionId: sub.id,
          studentName: String(studentMap.get(sub.studentId) || "학생"),
          status: sub.status,
          x: verdicts.filter((v: string) => v === "X").length,
          tri: verdicts.filter((v: string) => v === "TRI").length,
          check: verdicts.filter((v: string) => v === "CHECK").length,
        });
      }
      setRows(next);
    }
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [params.worksheetId]);

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>반별 결과</h1>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <li key={r.submissionId}>
            <Link
              href={`/review/${r.submissionId}`}
              className="panel"
              style={{
                display: "block",
                outline: r.check > 0 ? "2px solid #3558c7" : undefined,
              }}
            >
              <strong>{r.studentName}</strong>
              <div style={{ marginTop: 6 }}>
                <span className="badge badge-x">✕{r.x}</span>
                {" · "}
                <span className="badge badge-tri">△{r.tri}</span>
                {" · "}
                <span className="badge badge-check">?{r.check}</span>
              </div>
              <div style={{ marginTop: 4, color: "#5a6570", fontSize: 13 }}>
                {r.status === "needs_review"
                  ? "확인 필요 · 탭해서 처리"
                  : r.status === "grading" || r.status === "uploaded"
                    ? "채점 중…"
                    : r.status === "failed"
                      ? "실패 · 재촬영"
                      : "완료"}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
