import { NextResponse } from "next/server";
import {
  deletePhoto,
  getItemResults,
  getSubmission,
  updateItemResult,
  updateSubmission,
} from "@/lib/data/provider";
import type { FinalVerdict } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const submission = await getSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  let body: {
    resultId: string;
    verdict: FinalVerdict;
    applyReasonToWorksheet?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { resultId, verdict, applyReasonToWorksheet } = body;

  if (!["O", "TRI", "X"].includes(verdict)) {
    return NextResponse.json({ error: "invalid verdict" }, { status: 400 });
  }

  const result = await updateItemResult(resultId, {
    finalVerdict: verdict,
    resolvedAt: new Date().toISOString(),
  });
  if (!result) {
    return NextResponse.json({ error: "result not found" }, { status: 404 });
  }

  if (applyReasonToWorksheet) {
    for (const r of await getItemResults(id)) {
      if (r.id === resultId || r.finalVerdict || r.autoVerdict !== "CHECK") {
        continue;
      }
      const sameType = result.reasonCode
        ? r.reasonCode === result.reasonCode
        : true;
      if (sameType) {
        await updateItemResult(r.id, {
          finalVerdict: verdict,
          resolvedAt: new Date().toISOString(),
        });
      }
    }
  }

  const open = (await getItemResults(id)).filter(
    (r) => r.autoVerdict === "CHECK" && !r.finalVerdict,
  );

  if (open.length === 0) {
    await deletePhoto(submission.photoPath);
    await updateSubmission(id, {
      status: "done",
      photoPath: null,
      photoDataUrl: null,
    });
  } else {
    await updateSubmission(id, { status: "needs_review" });
  }

  return NextResponse.json({ result, open: open.length });
}
