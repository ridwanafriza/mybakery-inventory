/**
 * Entry point mock API — menangani SEMUA request `/api/*`.
 *
 * - Mode mock  → `handleMockApi()` (data demo in-memory, tanpa Laravel).
 * - Mode asli  → diteruskan ke `BACKEND_URL` (rewrite di next.config tidak
 *                dipakai karena route handler ini menimpanya).
 */

import { handleMockApi } from "@/lib/mock/router";
import { isMockMode, proxyToBackend } from "@/lib/mock/mode";

type Params = { path: string[] };

async function handle(request: Request, { params }: { params: Promise<Params> }) {
  const { path } = await params;
  if (isMockMode()) return handleMockApi(request, path);
  return proxyToBackend(request, "api", path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
