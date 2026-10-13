"use client";

import { useState } from "react";

interface BarcodeDisplayProps {
  barcode: string;
  itemName?: string;
  size?: "sm" | "md" | "lg";
}

export function BarcodeDisplay({ barcode, itemName, size = "md" }: BarcodeDisplayProps) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const px = sizeMap[size];

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&data=${encodeURIComponent(barcode)}&bgcolor=FFFFFF&color=000000`;

  if (imgError) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center rounded-lg border border-line bg-background font-mono text-[11px] font-bold text-ink px-2 py-1">
          {barcode}
        </div>
        {itemName && <span className="text-[10px] text-ink-muted truncate max-w-[100px]">{itemName}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={qrUrl}
        alt={`QR ${barcode}`}
        width={px}
        height={px}
        className="rounded-lg border border-line"
        onError={() => setImgError(true)}
      />
      <span className="font-mono text-[10px] font-semibold text-ink-muted">{barcode}</span>
      {itemName && <span className="text-[10px] text-ink-muted truncate max-w-[100px]">{itemName}</span>}
    </div>
  );
}
