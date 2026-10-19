"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "katex/dist/katex.min.css";
// katex render via dangerously with katex
import katex from "katex";

type Section = {
  label: string;
  items: { number: string; answer_latex: string; instruction_hint?: string | null }[];
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
  const [preset, setPreset] = useState("DEFAULT");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onFile(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/answer-key/extract", { method: "POST", body: fd });
      const data = await res.json();
      setSections(data.sections || []);
      setActive(0);
    } catch {
      setMessage("추출 실패");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!sections?.[active]) return;
    setBusy(true);
    const sec = sections[active];
    const res = await fetch("/api/answer-key/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${sec.label} 연산`,
        sectionLabel: sec.label,
        preset,
        items: sec.items.map((i) => ({
          number: i.number,
          answerLatex: i.answer_latex,
        })),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.originalDeleted) {
      setMessage("저장됨 · 원본 이미지 삭제됨");
    }
  }

  const current = sections?.[active];

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>정답지 등록</h1>
      <p style={{ color: "#5a6570", marginTop: 0 }}>
        HWP는 PDF로 저장해서 올려주세요. (mock 비전은 파일 내용과 무관하게 샘플 정답을 반환합니다)
      </p>

      <label className="btn btn-primary" style={{ width: "100%", marginBottom: 16 }}>
        {busy ? "처리 중…" : "사진 / 파일 선택"}
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
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {sections.map((s, i) => (
              <button
                key={s.label}
                type="button"
                className="btn btn-secondary"
                style={{
                  minHeight: 40,
                  background: i === active ? "var(--accent)" : undefined,
                  color: i === active ? "#fff" : undefined,
                }}
                onClick={() => setActive(i)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>형태 규칙 프리셋</div>
            <select
              className="field"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              <option value="DEFAULT">DEFAULT</option>
              <option value="ELEM_FRACTION">ELEM_FRACTION (약분 엄격)</option>
              <option value="MIDDLE_RADICAL">MIDDLE_RADICAL</option>
              <option value="EXPAND_FACTOR">EXPAND_FACTOR</option>
            </select>
          </label>

          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {current?.items.map((item, idx) => (
              <li key={item.number} className="panel">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.number}번</div>
                <input
                  className="field"
                  value={item.answer_latex}
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
                  <div style={{ marginTop: 6, fontSize: 13, color: "#5a6570" }}>
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
        </>
      )}

      {message ? (
        <p style={{ marginTop: 16, fontWeight: 700, color: "var(--accent)" }}>{message}</p>
      ) : null}
    </main>
  );
}
