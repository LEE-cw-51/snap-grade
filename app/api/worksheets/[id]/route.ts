import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  enqueueRegrade,
  getAnswerItems,
  getWorksheet,
  listSubmissionsForWorksheet,
  updateAnswerItemLatex,
} from "@/lib/data/provider";
import { runGradingJob } from "@/lib/grading/run-job";
import { assertDemoApiSecret } from "@/lib/ops/auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const worksheet = await getWorksheet(id);
  if (!worksheet) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const items = await getAnswerItems(id);
  return NextResponse.json({
    worksheet,
    items,
    keyErrors: items.filter((i) => i.keyErrorFlag),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = assertDemoApiSecret(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const worksheet = await getWorksheet(id);
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
  const item = await updateAnswerItemLatex(itemId, answerLatex);
  if (!item || item.worksheetId !== id) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  const jobs = [];
  let skipped = 0;
  for (const sub of await listSubmissionsForWorksheet(id)) {
    const job = await enqueueRegrade(sub.id);
    if (job) {
      jobs.push(job);
      after(async () => {
        await runGradingJob(sub.id);
      });
    } else {
      skipped += 1;
    }
  }

  return NextResponse.json({
    item,
    requeued: jobs.length,
    skipped,
  });
}
