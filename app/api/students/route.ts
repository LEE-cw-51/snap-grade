import { NextResponse } from "next/server";
import { addStudent, demoTeacherId, listStudents } from "@/lib/data/provider";
import { assertDemoApiSecret } from "@/lib/ops/auth";

export async function GET(req: Request) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

  const teacherId = await demoTeacherId();
  return NextResponse.json({ students: await listStudents(teacherId) });
}

export async function POST(req: Request) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

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
