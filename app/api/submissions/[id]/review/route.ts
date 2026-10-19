import { NextResponse } from "next/server";
import {
  deletePhoto,
  getItemResults,
  getSubmission,
  updateItemResult,
  updateSubmission,
} from "@/lib/data/memory-store";
import type { FinalVerdict } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const submission = getSubmission(id);
  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await req.json();
  const { resultId, verdict, applyReasonToWorksheet } = body as {
    resultId: string;
    verdict: FinalVerdict;
    applyReasonToWorksheet?: boolean;
  };

  if (!["O", "TRI", "X"].includes(verdict)) {
    return NextResponse.json({ error: "invalid verdict" }, { status: 400 });
  }

  const result = updateItemResult(resultId, {
    finalVerdict: verdict,
    resolvedAt: new Date().toISOString(),
  });
  if (!result) {
    return NextResponse.json({ error: "result not found" }, { status: 404 });
  }

  if (applyReasonToWorksheet) {
    for (const r of getItemResults(id)) {
      if (r.id === resultId || r.finalVerdict || r.autoVerdict !== "CHECK") {
        continue;
      }
      // Same reason code when present; otherwise all open ? on this sheet.
      const sameType = result.reasonCode
        ? r.reasonCode === result.reasonCode
        : true;
      if (sameType) {
        updateItemResult(r.id, {
          finalVerdict: verdict,
          resolvedAt: new Date().toISOString(),
        });
      }
    }
  }

  const open = getItemResults(id).filter(
    (r) => r.autoVerdict === "CHECK" && !r.finalVerdict,
  );

  if (open.length === 0) {
    deletePhoto(submission.photoPath);
    updateSubmission(id, {
      status: "done",
      photoPath: null,
      photoDataUrl: null,
    });
  } else {
    updateSubmission(id, { status: "needs_review" });
  }

  return NextResponse.json({ result, open: open.length });
}
