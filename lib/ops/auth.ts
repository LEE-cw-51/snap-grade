import { NextResponse } from "next/server";

function headerSecret(req: Request, headerName: string): string | null {
  const direct = req.headers.get(headerName);
  if (direct) return direct.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/** Ops routes: require OPS_SECRET via x-ops-secret or Authorization Bearer. */
export function assertOpsSecret(req: Request): NextResponse | null {
  const expected = process.env.OPS_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "ops_secret_not_configured" },
      { status: 403 },
    );
  }
  const provided = headerSecret(req, "x-ops-secret");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * When DATA_PROVIDER=supabase, require DEMO_API_SECRET
 * via x-demo-secret or Authorization Bearer.
 * Memory mode: no-op.
 */
export function assertDemoApiSecret(req: Request): NextResponse | null {
  if ((process.env.DATA_PROVIDER || "memory") !== "supabase") {
    return null;
  }
  const expected = process.env.DEMO_API_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        error: "demo_api_secret_required",
        message:
          "DATA_PROVIDER=supabase requires DEMO_API_SECRET. See docs/local-supabase.md",
      },
      { status: 503 },
    );
  }
  const provided = headerSecret(req, "x-demo-secret");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

/** True only when E2E may pass synthetic clocks / reset. */
export function allowE2eOverrides(): boolean {
  return process.env.ALLOW_E2E_RESET === "1";
}
