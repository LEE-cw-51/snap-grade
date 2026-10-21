import { NextResponse } from "next/server";
import { addStudent, demoTeacherId, listStudents } from "@/lib/data/provider";

export async function GET() {
  const teacherId = await demoTeacherId();
  return NextResponse.json({ students: await listStudents(teacherId) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, className } = body as { name: string; className?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const teacherId = await demoTeacherId();
  const student = await addStudent(
    teacherId,
    name.trim(),
    className?.trim() || "",
  );
  return NextResponse.json({ student });
}
