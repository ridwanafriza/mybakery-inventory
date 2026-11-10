/**
 * Pengganti `/sanctum/*` (dipakai FE untuk `csrf-cookie`).
 *
 * Mode mock  → balas 204 + cookie XSRF-TOKEN dummy (Sanctum tidak ada).
 * Mode asli  → diteruskan ke `BACKEND_URL`.
 */

import { csrfCookie } from "@/lib/mock/db";
import { isMockMode, proxyToBackend } from "@/lib/mock/mode";

type Params = { path: string[] };

async function handle(request: Request, { params }: { params: Promise<Params> }) {
  const { path } = await params;

  if (isMockMode()) {
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": csrfCookie() },
    });
  }

  return proxyToBackend(request, "sanctum", path);
}

export const GET = handle;
export const POST = handle;
