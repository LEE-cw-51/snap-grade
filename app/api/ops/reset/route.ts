import { NextResponse } from "next/server";
import { dataProviderName, resetStore } from "@/lib/data/provider";
import { assertOpsSecret } from "@/lib/ops/auth";

export async function POST(req: Request) {
  if (process.env.ALLOW_E2E_RESET !== "1") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const denied = assertOpsSecret(req);
  if (denied) return denied;

  if (dataProviderName() !== "memory") {
    return NextResponse.json(
      { error: "reset only supported for memory provider" },
      { status: 400 },
    );
  }
  await resetStore();
  return NextResponse.json({ ok: true });
}
