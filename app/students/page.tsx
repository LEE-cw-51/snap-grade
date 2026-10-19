"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Student = { id: string; name: string; className: string };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("초4-A");

  async function load() {
    const res = await fetch("/api/students");
    const data = await res.json();
    setStudents(data.students || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, className }),
    });
    setName("");
    await load();
  }

  return (
    <main>
      <Link href="/" style={{ fontSize: 14, color: "#5a6570" }}>
        ← 홈
      </Link>
      <h1 style={{ fontSize: 28, margin: "12px 0" }}>학생 관리</h1>

      <div className="panel" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <input
          className="field"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field"
          placeholder="반"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={() => void add()}>
          추가
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {students.map((s) => (
          <li key={s.id} className="panel">
            <strong>{s.name}</strong>
            <div style={{ color: "#5a6570" }}>{s.className}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
