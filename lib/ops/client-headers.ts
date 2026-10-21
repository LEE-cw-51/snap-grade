/**
 * Browser fetch headers for supabase demo mode.
 * Set NEXT_PUBLIC_DEMO_API_SECRET only on trusted local machines.
 */
export function demoApiHeaders(
  init?: HeadersInit,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (init) {
    const h = new Headers(init);
    h.forEach((v, k) => {
      out[k] = v;
    });
  }
  const secret = process.env.NEXT_PUBLIC_DEMO_API_SECRET;
  if (secret) {
    out["x-demo-secret"] = secret;
  }
  return out;
}

export async function apiFetch(input: string, init?: RequestInit) {
  const headers = demoApiHeaders(init?.headers);
  return fetch(input, { ...init, headers });
}
