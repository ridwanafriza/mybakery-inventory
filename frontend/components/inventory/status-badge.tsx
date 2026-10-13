"use client";

import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/types";

const statusConfig: Record<
  ItemStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  good: {
    label: "IN STOCK",
    dotColor: "bg-status-good",
    textColor: "text-status-good",
  },
  low_stock: {
    label: "LOW STOCK",
    dotColor: "bg-status-low",
    textColor: "text-status-low",
  },
  expired: {
    label: "EXPIRED",
    dotColor: "bg-status-expired",
    textColor: "text-status-expired",
  },
  out_of_stock: {
    label: "OUT OF STOCK",
    dotColor: "bg-status-out",
    textColor: "text-status-out",
  },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", config.textColor)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
