"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Worksheet = { id: string; title: string; sectionLabel: string };
type Student = { id: string; name: string; className: string };
type QueueItem = {
  studentName: string;
  submissionId: string;
  status: string;
};

export default function GradePage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [worksheetId, setWorksheetId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/worksheets").then((r) => r.json()),
      fetch("/api/students").then((r) => r.json()),
    ]).then(([w, s]) => {
      setWorksheets(w.worksheets || []);
      setStudents(s.students || []);
      if (w.worksheets?.[0]) setWorksheetId(w.worksheets[0].id);
      if (s.students?.[0]) setStudentId(s.students[0].id);
    });
  }, []);

  async function upload(file: File) {
    if (!worksheetId || !studentId || uploading) return;
    setUploading(true);
    setHint("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const studentName =
        students.find((s) => s.id === studentId)?.name || "";
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worksheetId, studentId, photoDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint(data.error === "daily limit" ? "오늘 채점 한도입니다. 내일 다시 시도하세요." : data.error || "업로드 실패");
        return;
      }
      setQueue((q) => [
        {
          studentName,
          submissionId: data.submission.id,
          status: data.submission.status,
        },
        ...q,
      ]);
      const idx = students.findIndex((s) => s.id === studentId);
      if (idx >= 0 && idx < students.length - 1) {
        setStudentId(students[idx + 1].id);
        setHint("다음 학생으로 넘어갔습니다. 바로 이어서 촬영하세요.");
      } else {
        setHint("업로드됨. 채점은 백그라운드에서 진행됩니다.");
      }
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (queue.length === 0) return;
    const t = setInterval(async () => {
      const next = [...queue];
      let changed = false;
      for (let i = 0; i < next.length; i++) {
        if (["done", "needs_review", "failed"].includes(next[i].status)) {
          continue;
        }
        const res = await fetch(`/api/submissions/${next[i].submissionId}`);
        const data = await res.json();
        if (
          data.submission?.status &&
          data.submission.status !== next[i].status
        ) {
          next[i] = { ...next[i], status: data.submission.status };
          changed = true;
        }
      }
      if (changed) setQueue(next);
    }, 2000);
    return () => clearInterval(t);
  }, [queue]);

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>연속 채점</h1>
      <p style={{ color: "#5a6570", marginTop: 0 }}>
        업로드만 동기입니다. 채점이 끝나기 전에 다음 학생을 찍을 수 있습니다.
      </p>

      {!worksheets.length ? (
        <div className="panel">
          먼저 정답지를 등록하세요.{" "}
          <Link href="/answer-key" style={{ color: "var(--accent)", fontWeight: 700 }}>
            정답지 등록
          </Link>
        </div>
      ) : !students.length ? (
        <div className="panel">
          학생을 먼저 추가하세요.{" "}
          <Link href="/students" style={{ color: "var(--accent)", fontWeight: 700 }}>
            학생 관리
          </Link>
        </div>
      ) : (
        <>
          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>학습지</div>
            <select
              className="field"
              value={worksheetId}
              onChange={(e) => setWorksheetId(e.target.value)}
            >
              {worksheets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                  {w.sectionLabel ? ` · ${w.sectionLabel}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>학생</div>
            <select
              className="field"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.className}
                </option>
              ))}
            </select>
          </label>

          <label className="btn btn-primary" style={{ width: "100%" }}>
            {uploading ? "업로드 중…" : "촬영 / 업로드"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>

          {hint ? (
            <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
              {hint}
            </p>
          ) : (
            <p style={{ color: "#5a6570", fontSize: 14 }}>
              기울기·가로 촬영은 피하고, 한 장에 한 학습지가 들어오게 찍어 주세요.
            </p>
          )}

          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {queue.map((q) => (
              <li key={q.submissionId} className="panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <strong>{q.studentName}</strong>
                  <span>{statusLabel(q.status)}</span>
                </div>
                {["done", "needs_review"].includes(q.status) ? (
                  <Link
                    href={`/review/${q.submissionId}`}
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    {q.status === "needs_review" ? "확인 필요 처리" : "결과 보기"}
                  </Link>
                ) : null}
                {q.status === "failed" ? (
                  <div style={{ marginTop: 8, color: "var(--danger)", fontSize: 14 }}>
                    채점 실패 · 다시 촬영해 주세요
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {worksheetId ? (
            <Link
              href={`/results/${worksheetId}`}
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 16 }}
            >
              반별 결과 목록
            </Link>
          ) : null}
        </>
      )}
    </main>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "uploaded":
    case "grading":
      return "채점 중";
    case "done":
      return "완료";
    case "needs_review":
      return "확인 필요";
    case "failed":
      return "실패";
    default:
      return s;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
