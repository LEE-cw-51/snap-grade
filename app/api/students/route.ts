import { NextResponse } from "next/server";
import { addStudent, demoTeacherId, listStudents } from "@/lib/data/memory-store";

export async function GET() {
  return NextResponse.json({ students: listStudents(demoTeacherId()) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const className = String(body.className || "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const student = addStudent(demoTeacherId(), name, className);
  return NextResponse.json({ student });
}
