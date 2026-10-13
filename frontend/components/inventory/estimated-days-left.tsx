"use client";

import { Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indikator "Estimasi Habis" (Fase 15).
 * Warna pakai token status yang sudah ada (DESIGN.md §6):
 * - ≤ critical (default 3) → merah (status-expired)
 * - ≤ warning (default 7) → kuning (status-low)
 * - > warning → netral (ink-muted)
 * - null ("Data belum cukup") → netral, tanpa warna status
 */
export function EstimatedDaysLeft({
  days,
  critical = 3,
  warning = 7,
}: {
  days: number | null | undefined;
  critical?: number;
  warning?: number;
}) {
  if (days === null || days === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
        <Hourglass className="h-3.5 w-3.5" strokeWidth={1.75} />
        Data belum cukup
      </span>
    );
  }

  const level =
    days <= critical
      ? "text-status-expired"
      : days <= warning
        ? "text-status-low"
        : "text-ink-muted";

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", level)}>
      <Hourglass className="h-3.5 w-3.5" strokeWidth={1.75} />
      {days} hari
    </span>
  );
}
