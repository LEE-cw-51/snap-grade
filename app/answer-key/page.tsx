"use client";

import katex from "katex";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PRESET_OPTIONS, suggestPresetFromHints } from "@/lib/form-presets";
import "katex/dist/katex.min.css";

type Section = {
  label: string;
  items: {
    number: string;
    answer_latex: string;
    instruction_hint?: string | null;
  }[];
};

function MathView({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { throwOnError: false });
    } catch {
      return latex;
    }
  }, [latex]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function AnswerKeyPage() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [active, setActive] = useState(0);
  const [titles, setTitles] = useState<string[]>([]);
  const [preset, setPreset] = useState("DEFAULT");
  const [presetNote, setPresetNote] = useState("");
  const [savedLabels, setSavedLabels] = useState<Set<string>>(new Set());
  const [lastWorksheetId, setLastWorksheetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onFile(file: File) {
    setBusy(true);
    setMessage("");
    setError("");
    setSavedLabels(new Set());
    setLastWorksheetId(null);
    try {
      if (file.name.toLowerCase().endsWith(".hwp")) {
        setError("HWP는 지원하지 않습니다. PDF로 저장한 뒤 올려주세요.");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/answer-key/extract", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        setError("추출 실패");
        return;
      }
      const data = await res.json();
      const next: Section[] = data.sections || [];
      setSections(next);
      setActive(0);
      setTitles(next.map((s) => `${s.label} 연산`));
      const suggested = suggestPresetFromHints(
        next.flatMap((s) => s.items.map((i) => i.instruction_hint)),
      );
      setPreset(suggested);
      setPresetNote(
        suggested === "DEFAULT"
          ? "지시문이 없어 기본 프리셋을 썼습니다. 필요하면 바꿔 주세요."
          : `지시문을 보고 ${suggested} 프리셋을 추천했습니다.`,
      );
    } catch {
      setError("추출 실패");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!sections?.[active]) return;
    const sec = sections[active];
    const empty = sec.items.some((i) => !i.answer_latex.trim());
    if (empty) {
      setError("빈 정답이 있습니다. 비운 칸을 채우거나 문항을 확인하세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/answer-key/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titles[active] || `${sec.label} 연산`,
          sectionLabel: sec.label,
          preset,
          items: sec.items.map((i) => ({
            number: i.number,
            answerLatex: i.answer_latex,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장 실패");
        return;
      }
      setSavedLabels((prev) => new Set(prev).add(sec.label));
      setLastWorksheetId(data.worksheet?.id ?? null);
      setMessage(
        data.originalDeleted
          ? `${sec.label} 저장됨 · 원본 이미지 삭제됨`
          : `${sec.label} 저장됨`,
      );
    } catch {
      setError("저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const current = sections?.[active];
  const allSaved =
    !!sections?.length && sections.every((s) => savedLabels.has(s.label));

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>정답지 등록</h1>
      <p style={{ color: "#5a6570", marginTop: 0 }}>
        여러 회차가 한 장에 있으면 구간별로 나눠 각각 학습지로 저장합니다. mock
        비전은 파일과 무관하게 샘플 정답을 반환합니다.
      </p>

      <label
        className="btn btn-primary"
        style={{ width: "100%", marginBottom: 16 }}
      >
        {busy ? "처리 중…" : "사진 / PDF 선택"}
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          hidden
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>

      {sections && (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {sections.map((s, i) => {
              const saved = savedLabels.has(s.label);
              return (
                <button
                  key={s.label}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    minHeight: 40,
                    background: i === active ? "var(--accent)" : undefined,
                    color: i === active ? "#fff" : undefined,
                    borderColor: saved ? "var(--accent)" : undefined,
                  }}
                  onClick={() => setActive(i)}
                >
                  {s.label}
                  {saved ? " ✓" : ""}
                </button>
              );
            })}
          </div>

          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>학습지 제목</div>
            <input
              className="field"
              value={titles[active] || ""}
              onChange={(e) => {
                const next = [...titles];
                next[active] = e.target.value;
                setTitles(next);
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              형태 규칙 프리셋
            </div>
            <select
              className="field"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                setPresetNote("프리셋을 직접 선택했습니다.");
              }}
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {presetNote ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "#5a6570" }}>
                {presetNote}
              </div>
            ) : null}
          </label>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {current?.items.map((item, idx) => (
              <li key={`${item.number}-${idx}`} className="panel">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {item.number}번
                </div>
                <input
                  className="field"
                  value={item.answer_latex}
                  aria-label={`${item.number}번 정답 LaTeX`}
                  onChange={(e) => {
                    const next = structuredClone(sections);
                    next[active].items[idx].answer_latex = e.target.value;
                    setSections(next);
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <MathView latex={item.answer_latex} />
                </div>
                {item.instruction_hint ? (
                  <div
                    style={{ marginTop: 6, fontSize: 13, color: "#5a6570" }}
                  >
                    지시: {item.instruction_hint}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 16 }}
            disabled={busy}
            onClick={() => void save()}
          >
            이 구간 저장
          </button>

          {savedLabels.size > 0 ? (
            <div className="panel" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                저장됨: {[...savedLabels].join(", ")}
                {allSaved ? " (모든 구간)" : ""}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {lastWorksheetId ? (
                  <Link
                    className="btn btn-secondary"
                    href={`/results/${lastWorksheetId}`}
                  >
                    방금 저장한 학습지 보기
                  </Link>
                ) : null}
                <Link className="btn btn-secondary" href="/students">
                  학생 등록하러 가기
                </Link>
                <Link className="btn btn-primary" href="/grade">
                  채점 시작
                </Link>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p style={{ marginTop: 16, fontWeight: 700, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          style={{ marginTop: 16, fontWeight: 700, color: "var(--accent)" }}
        >
          {message}
        </p>
      ) : null}
    </main>
  );
}
