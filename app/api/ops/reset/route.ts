import { NextResponse } from "next/server";
import { resetMemoryStore } from "@/lib/data/memory-store";

/**
 * Clears the memory store for Playwright / local demos.
 * Enabled only when ALLOW_E2E_RESET=1 (never in production).
 */
export async function POST() {
  if (process.env.ALLOW_E2E_RESET !== "1") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if ((process.env.DATA_PROVIDER || "memory") !== "memory") {
    return NextResponse.json(
      { error: "reset only supported for memory provider" },
      { status: 400 },
    );
  }
  resetMemoryStore();
  return NextResponse.json({ ok: true });
}
