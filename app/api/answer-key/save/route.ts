import { NextResponse } from "next/server";
import { createWorksheet, demoTeacherId } from "@/lib/data/memory-store";
import { FORM_PRESETS, type FormRules } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    title,
    sectionLabel,
    preset = "DEFAULT",
    formRules,
    items,
  } = body as {
    title: string;
    sectionLabel: string;
    preset?: string;
    formRules?: FormRules;
    items: { number: string; answerLatex: string }[];
  };

  if (!title || !items?.length) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (items.some((i) => !i.number || !String(i.answerLatex ?? "").trim())) {
    return NextResponse.json(
      { error: "empty answer not allowed" },
      { status: 400 },
    );
  }

  const rules = formRules || FORM_PRESETS[preset] || FORM_PRESETS.DEFAULT;
  const ws = createWorksheet({
    teacherId: demoTeacherId(),
    title,
    sectionLabel: sectionLabel || "",
    formRules: rules,
    items,
  });

  // Answer-key originals are never persisted in memory mode (deleted immediately).
  return NextResponse.json({ worksheet: ws, originalDeleted: true });
}
