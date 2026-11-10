/**
 * Penentu mode API: mock (demo tanpa backend Laravel) vs proxy ke backend asli.
 *
 * Urutan keputusan:
 * 1. `USE_MOCK_API=1`  → selalu mock.
 * 2. `USE_MOCK_API=0`  → selalu proxy (abaikan kondisi lain).
 * 3. `BACKEND_URL` terisi → proxy ke URL tersebut.
 * 4. Selain itu: di production (Vercel) → mock; di development → localhost:8000.
 *
 * Karena route handler `app/api/[...path]` menimpa rewrite di next.config,
 * keputusan ini dipakai di dua tempat supaya tetap konsisten.
 */

export function isMockMode(): boolean {
  const flag = process.env.USE_MOCK_API;
  if (flag === "1") return true;
  if (flag === "0") return false;
  if (process.env.BACKEND_URL) return false;
  return process.env.NODE_ENV !== "development";
}

export function backendBaseUrl(): string {
  return (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
}

/** Teruskan request ke backend Laravel asli (dipakai saat mode non-mock). */
export async function proxyToBackend(
  request: Request,
  prefix: "api" | "sanctum",
  segments: string[]
): Promise<Response> {
  const path = segments.filter(Boolean).map(encodeURIComponent).join("/");
  const url = new URL(request.url);
  const target = `${backendBaseUrl()}/${prefix}${path ? `/${path}` : ""}${url.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") return;
    headers.set(key, value);
  });

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
