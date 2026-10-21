"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/ops/client-headers";

type Row = {
  submissionId: string;
  studentName: string;
  status: string;
  x: number;
  tri: number;
  check: number;
  photoWarn: boolean;
  photoDeleteAt: string | null;
};

type KeyError = {
  id: string;
  number: string;
  answerLatex: string;
};

export default function ResultsPage() {
  const params = useParams<{ worksheetId: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [keyErrors, setKeyErrors] = useState<KeyError[]>([]);
  const [fix, setFix] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [subsData, studentsData, wsData] = await Promise.all([
      apiFetch(`/api/submissions?worksheetId=${params.worksheetId}`).then((r) =>
        r.json(),
      ),
      apiFetch("/api/students").then((r) => r.json()),
      apiFetch(`/api/worksheets/${params.worksheetId}`).then((r) => r.json()),
    ]);
    const studentMap = new Map(
      (studentsData.students || []).map((s: { id: string; name: string }) => [
        s.id,
        s.name,
      ]),
    );

    const next: Row[] = [];
    for (const sub of subsData.submissions || []) {
      const detail = await apiFetch(`/api/submissions/${sub.id}`).then((r) =>
        r.json(),
      );
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
        photoWarn: !!sub.photoDeleteWarnedAt && !!sub.photoPath,
        photoDeleteAt: sub.photoDeleteAt,
      });
    }
    setRows(next);
    setKeyErrors(wsData.keyErrors || []);
    const init: Record<string, string> = {};
    for (const k of wsData.keyErrors || []) {
      init[k.id] = k.answerLatex;
    }
    setFix(init);
  }, [params.worksheetId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);

  async function saveKeyFix(itemId: string) {
    setMessage("");
    const res = await apiFetch(`/api/worksheets/${params.worksheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, answerLatex: fix[itemId] }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "수정 실패");
      return;
    }
    setMessage(`정답 수정됨 · ${data.requeued}건 재판정 큐에 넣었습니다.`);
    await load();
  }

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>반별 결과</h1>

      {keyErrors.length > 0 ? (
        <section
          className="panel"
          style={{ marginBottom: 16, borderColor: "var(--warn)" }}
        >
          <strong>정답지 오류 의심</strong>
          <p style={{ margin: "6px 0 12px", color: "#5a6570", fontSize: 14 }}>
            여러 학생의 계산값이 정답지와 다릅니다. 자동 수정하지 않습니다.
          </p>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
            {keyErrors.map((k) => (
              <li key={k.id}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {k.number}번
                </div>
                <input
                  className="field"
                  value={fix[k.id] ?? ""}
                  onChange={(e) =>
                    setFix((prev) => ({ ...prev, [k.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 8, minHeight: 40 }}
                  onClick={() => void saveKeyFix(k.id)}
                >
                  정답 수정 후 재판정
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {message ? (
        <p style={{ fontWeight: 700, color: "var(--accent)" }}>{message}</p>
      ) : null}

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
              {r.photoWarn ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--warn)",
                  }}
                >
                  사진 삭제 임박
                  {r.photoDeleteAt
                    ? ` · ${new Date(r.photoDeleteAt).toLocaleDateString()}`
                    : ""}
                </div>
              ) : null}
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
