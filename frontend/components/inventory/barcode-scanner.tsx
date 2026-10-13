"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import type { Item, BranchStock } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanLine, Package, X } from "lucide-react";

interface ScanResult {
  item: Item;
  stocks: BranchStock[];
}

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItem?: (item: Item) => void;
}

export function BarcodeScanner({ open, onOpenChange, onSelectItem }: BarcodeScannerProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleScan = async (code?: string) => {
    const barcode = (code || query).trim();
    if (!barcode) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.get(`/api/items/scan/${encodeURIComponent(barcode)}`);
      setResult(res.data);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          setError("Item dengan barcode ini tidak ditemukan");
        } else {
          setError("Gagal memindai barcode");
        }
      } else {
        setError("Gagal memindai barcode");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold">
            <ScanLine className="h-5 w-5 text-accent" strokeWidth={1.75} />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik atau scan barcode..."
                className="pl-9 h-11 text-[14px] rounded-xl"
              />
            </div>
            <Button
              onClick={() => handleScan()}
              disabled={loading || !query.trim()}
              className="h-11 px-4 rounded-xl bg-accent hover:bg-accent/90"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Cari"
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-xl bg-status-expired/10 px-4 py-3 text-[13px] text-status-expired">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-start gap-3">
                {result.item.image ? (
                  <img
                    src={result.item.image}
                    alt={result.item.name}
                    className="h-14 w-14 rounded-xl object-cover border border-line"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-ink-muted">
                    <Package className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-ink truncate">{result.item.name}</p>
                  <p className="text-[12px] text-ink-muted">{result.item.category?.name} · {result.item.unit}</p>
                  <p className="font-mono text-[11px] text-ink-muted mt-0.5">{result.item.barcode}</p>
                </div>
                {onSelectItem && (
                  <Button
                    size="sm"
                    className="shrink-0 rounded-lg bg-accent hover:bg-accent/90"
                    onClick={() => {
                      onSelectItem(result.item);
                      onOpenChange(false);
                    }}
                  >
                    Pilih
                  </Button>
                )}
              </div>

              {result.stocks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Stok per Cabang</p>
                  {result.stocks.map((stock) => (
                    <div key={stock.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                      <span className="text-[13px] text-ink">{stock.branch?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">{stock.quantity} {result.item.unit}</span>
                        <Badge
                          variant="outline"
                          className={
                            stock.status === "good"
                              ? "border-status-good/30 text-status-good bg-status-good/10"
                              : stock.status === "low_stock"
                              ? "border-status-low/30 text-status-low bg-status-low/10"
                              : stock.status === "expired"
                              ? "border-status-expired/30 text-status-expired bg-status-expired/10"
                              : "border-status-out/30 text-status-out bg-status-out/10"
                          }
                        >
                          {stock.status === "good" ? "Aman" : stock.status === "low_stock" ? "Rendah" : stock.status === "expired" ? "Expired" : "Habis"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.stocks.length === 0 && (
                <p className="text-[12px] text-ink-muted text-center py-2">Belum ada stok untuk item ini</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
