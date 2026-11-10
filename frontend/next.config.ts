import type { NextConfig } from "next";

/**
 * Mode API:
 * - Mock (demo tanpa backend Laravel) aktif saat `USE_MOCK_API=1`, atau saat
 *   `BACKEND_URL` tidak diisi dan bukan mode development (otomatis di Vercel).
 * - Selain itu, request diteruskan ke `BACKEND_URL` (default localhost:8000).
 *
 * Route handler di `app/api/[...path]` menimpa rewrite di bawah, jadi keputusan
 * yang sama diterapkan di `lib/mock/mode.ts` agar tetap konsisten.
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const USE_MOCK_API =
  process.env.USE_MOCK_API === "1"
    ? true
    : process.env.USE_MOCK_API === "0"
      ? false
      : !process.env.BACKEND_URL && process.env.NODE_ENV !== "development";

const nextConfig: NextConfig = {
  // Dipakai sisi client (mis. hint kredensial demo di halaman login).
  env: {
    NEXT_PUBLIC_USE_MOCK: USE_MOCK_API ? "1" : "0",
  },
  async rewrites() {
    if (USE_MOCK_API) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/sanctum/:path*",
        destination: `${BACKEND_URL}/sanctum/:path*`,
      },
    ];
  },
};

export default nextConfig;
