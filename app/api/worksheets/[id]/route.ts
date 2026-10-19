import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  enqueueRegrade,
  getAnswerItems,
  getWorksheet,
  listSubmissionsForWorksheet,
  updateAnswerItemLatex,
} from "@/lib/data/memory-store";
import { runGradingJob } from "@/lib/grading/run-job";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const worksheet = getWorksheet(id);
  if (!worksheet) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const items = getAnswerItems(id);
  return NextResponse.json({
    worksheet,
    items,
    keyErrors: items.filter((i) => i.keyErrorFlag),
  });
}

/** Fix a suspected answer-key item and re-queue grading for that worksheet. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const worksheet = getWorksheet(id);
  if (!worksheet) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await req.json();
  const { itemId, answerLatex } = body as {
    itemId: string;
    answerLatex: string;
  };
  if (!itemId || !String(answerLatex ?? "").trim()) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const item = updateAnswerItemLatex(itemId, answerLatex);
  if (!item || item.worksheetId !== id) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  const jobs = [];
  for (const sub of listSubmissionsForWorksheet(id)) {
    const job = enqueueRegrade(sub.id);
    if (job) {
      jobs.push(job);
      after(async () => {
        await runGradingJob(sub.id);
      });
    }
  }

  return NextResponse.json({ item, requeued: jobs.length });
}
