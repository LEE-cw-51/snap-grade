"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/ops/client-headers";

type Worksheet = {
  id: string;
  title: string;
  sectionLabel: string;
  createdAt: string;
};

export default function HomePage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);

  useEffect(() => {
    apiFetch("/api/worksheets")
      .then((r) => r.json())
      .then((d) => setWorksheets(d.worksheets || []));
  }, []);

  return (
    <main>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#5a6570", fontSize: 13, fontWeight: 700 }}>
          DEMO · mock vision
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 32, letterSpacing: "-0.03em" }}>
          snap-grade
        </h1>
        <p style={{ margin: "8px 0 0", color: "#4a5560", lineHeight: 1.45 }}>
          정답지 등록 후 숙제 사진만 찍으면 ✕ / △ / ? 만 보여줍니다.
        </p>
      </header>

      <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
        <Link className="btn btn-primary" href="/answer-key">
          정답지 등록
        </Link>
        <Link className="btn btn-secondary" href="/students">
          학생 관리
        </Link>
        <Link className="btn btn-secondary" href="/grade">
          채점 시작
        </Link>
      </div>

      <section>
        <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>학습지</h2>
        {worksheets.length === 0 ? (
          <div className="panel" style={{ color: "#5a6570" }}>
            아직 학습지가 없습니다. 정답지를 먼저 등록하세요.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {worksheets.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/results/${w.id}`}
                  className="panel"
                  style={{ display: "block" }}
                >
                  <strong>{w.title}</strong>
                  {w.sectionLabel ? (
                    <div style={{ color: "#5a6570", marginTop: 4 }}>{w.sectionLabel}</div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
