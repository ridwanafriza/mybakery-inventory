"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import type { Recipe, HppDetail } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Wallet, Eye, Download } from "lucide-react";

export default function HppPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<HppDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchRecipes = async () => {
    try {
      const res = await api.get("/api/finance/hpp");
      setRecipes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const viewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/finance/hpp/${id}`);
      setDetail(res.data.data);
      setDetailOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalHpp = recipes.reduce((sum, r) => sum + (r.hpp || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            HPP (Harga Pokok Produksi)
          </h1>
          <p className="text-[13px] text-ink-muted">
            Total biaya bahan per resep ({recipes.length} resep)
          </p>
        </div>
        <button
          onClick={() => downloadCsv("/api/export/hpp", "hpp-export.csv")}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Wallet className="h-5 w-5 text-accent" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Total HPP Semua Resep</p>
            <p className="text-[20px] font-bold text-ink">{formatRupiah(totalHpp)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Wallet className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada data resep
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama Resep</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Deskripsi</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Bahan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">HPP</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {recipe.name}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted max-w-[200px] truncate">
                    {recipe.description || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted text-right">
                    {recipe.items?.length || 0} bahan
                  </TableCell>
                  <TableCell className="text-[13px] font-semibold text-ink text-right">
                    {formatRupiah(recipe.hpp || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => viewDetail(recipe.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-accent/5"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Detail
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Detail HPP — {detail?.name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {detail.description && (
                <p className="text-[13px] text-ink-muted">{detail.description}</p>
              )}
              <div className="rounded-lg border border-line">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Bahan</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Qty</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Harga/Unit</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell className="text-[13px] font-medium text-ink">
                          {item.item_name}
                        </TableCell>
                        <TableCell className="text-[13px] text-ink-muted text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-[13px] text-ink-muted text-right">
                          {formatRupiah(item.cost_price)}
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-ink text-right">
                          {formatRupiah(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-accent/5 px-4 py-3">
                <span className="text-[13px] font-semibold text-ink">Total HPP</span>
                <span className="text-[16px] font-bold text-accent">{formatRupiah(detail.total_hpp)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
