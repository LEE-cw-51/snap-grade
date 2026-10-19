"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { REASON_LABELS } from "@/lib/types";

type Result = {
  id: string;
  number: string;
  autoVerdict: string;
  finalVerdict: string | null;
  reasonCode: string | null;
  aiEstimateLatex: string | null;
  studentAnswerLatex: string | null;
};

export default function ReviewPage() {
  const params = useParams<{ submissionId: string }>();
  const [studentName, setStudentName] = useState("");
  const [worksheetTitle, setWorksheetTitle] = useState("");
  const [status, setStatus] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [showO, setShowO] = useState(false);
  const [activeCheck, setActiveCheck] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/submissions/${params.submissionId}`);
    const data = await res.json();
    setStudentName(data.student?.name || "학생");
    setWorksheetTitle(data.worksheet?.title || "");
    setStatus(data.submission?.status || "");
    setPhoto(data.submission?.photoDataUrl || null);
    setResults(data.results || []);
  }, [params.submissionId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [load]);

  const effective = (r: Result) => r.finalVerdict || r.autoVerdict;
  const xs = results.filter((r) => effective(r) === "X");
  const tris = results.filter((r) => effective(r) === "TRI");
  const checks = results.filter(
    (r) => effective(r) === "CHECK" && !r.finalVerdict,
  );
  const os = results.filter((r) => effective(r) === "O");

  async function resolve(verdict: "O" | "TRI" | "X", applyAll?: boolean) {
    if (!activeCheck || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/submissions/${params.submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: activeCheck.id,
          verdict,
          applyReasonToWorksheet: !!applyAll,
        }),
      });
      setActiveCheck(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (activeCheck) {
    return (
      <main>
        <button
          type="button"
          onClick={() => setActiveCheck(null)}
          style={{
            background: "none",
            border: 0,
            color: "#5a6570",
            padding: 0,
          }}
        >
          ← 결과로
        </button>
        <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>
          확인 필요 · {activeCheck.number}번
        </h1>
        <p style={{ marginTop: 0, color: "#5a6570", fontSize: 14 }}>
          학생 글씨를 크게 보고, AI 추정은 참고만 하세요.
        </p>

        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "12px 0",
            wordBreak: "break-all",
          }}
        >
          {activeCheck.studentAnswerLatex || "(읽기 실패)"}
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#5a6570" }}>
          AI 추정:{" "}
          <code style={{ fontSize: 12 }}>
            {activeCheck.aiEstimateLatex || "—"}
          </code>
        </p>

        {photo ? (
          <div
            className="panel"
            style={{
              overflow: "auto",
              maxHeight: "40vh",
              touchAction: "pan-x pan-y pinch-zoom",
              marginBottom: 16,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="숙제 원본"
              style={{ width: "100%", minWidth: "100%", display: "block" }}
            />
          </div>
        ) : (
          <div className="panel" style={{ marginBottom: 16 }}>
            사진이 삭제되었거나 없습니다.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void resolve("O")}
          >
            ○
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void resolve("TRI")}
          >
            △
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => void resolve("X")}
          >
            ✕
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 12 }}
          disabled={busy}
          onClick={() => void resolve("TRI", true)}
        >
          이 학습지 남은 ? 모두 △
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 8 }}
          disabled={busy}
          onClick={() => void resolve("X", true)}
        >
          이 학습지 남은 ? 모두 ✕
        </button>
      </main>
    );
  }

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 26, margin: "12px 0 4px" }}>{studentName}</h1>
      <p style={{ marginTop: 0, color: "#5a6570" }}>
        {worksheetTitle}
        {worksheetTitle ? " · " : ""}
        {statusLabel(status)}
      </p>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="badge badge-x">✕ 틀린 번호</div>
        <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700 }}>
          {xs.length ? xs.map((r) => r.number).join(", ") : "없음"}
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="badge badge-tri">△ 세모 번호</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {tris.length === 0 ? <li>없음</li> : null}
          {tris.map((r) => (
            <li key={r.id}>
              {r.number}
              {r.reasonCode
                ? ` (${REASON_LABELS[r.reasonCode] || r.reasonCode})`
                : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="badge badge-check">? 확인 필요</div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
        >
          {checks.length === 0 ? <span>없음</span> : null}
          {checks.map((r) => (
            <button
              key={r.id}
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 40 }}
              onClick={() => setActiveCheck(r)}
            >
              {r.number}번
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="btn btn-secondary"
        style={{ width: "100%" }}
        onClick={() => setShowO((v) => !v)}
      >
        {showO ? "맞은 번호 숨기기" : "맞은 번호 펼치기"}
      </button>
      {showO ? (
        <p style={{ fontWeight: 700 }}>
          {os.map((r) => r.number).join(", ") || "없음"}
        </p>
      ) : null}
    </main>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "grading":
    case "uploaded":
      return "채점 중";
    case "done":
      return "완료";
    case "needs_review":
      return "확인 필요";
    case "failed":
      return "실패 · 다시 촬영";
    default:
      return s;
  }
}
