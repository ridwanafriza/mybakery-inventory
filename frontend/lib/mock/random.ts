/**
 * Deterministic PRNG untuk mock API.
 *
 * Seed tetap supaya dataset demo konsisten antar cold start (serverless),
 * sehingga angka di dashboard/lobby tidak "lompat-lompat" antar request.
 */

export interface Rng {
  float(): number;
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

export function makeRng(seed = 20260919): Rng {
  let state = seed >>> 0;

  const float = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    Math.floor(float() * (max - min + 1)) + min;

  const chance = (probability: number): boolean => float() < probability;

  const pick = <T>(items: readonly T[]): T => items[Math.floor(float() * items.length)];

  return { float, int, chance, pick };
}

export const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` untuk tanggal lokal (bukan UTC) — dipakai banding expiry. */
export function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Tanggal N hari dari hari ini (0 = hari ini). */
export function dateFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

/** ISO timestamp untuk N hari lalu + jam/menit acak (deterministik). */
export function timestampDaysAgo(daysAgo: number, rng: Rng): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rng.int(7, 20), rng.int(0, 59), rng.int(0, 59), 0);
  return d.toISOString();
}

/** ISO timestamp untuk N hari ke depan. */
export function timestampDaysAhead(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
