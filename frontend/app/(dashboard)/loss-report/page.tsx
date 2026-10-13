"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import type { Branch, LossReportItem } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Receipt, Download } from "lucide-react";

export default function LossReportPage() {
  const [data, setData] = useState<LossReportItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filters, setFilters] = useState({
    branch_id: "",
    start_date: "",
    end_date: "",
  });

  const fetchBranches = async () => {
    const res = await api.get("/api/branches");
    setBranches(res.data.data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append("branch_id", filters.branch_id);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const res = await api.get(`/api/finance/loss-report?${params.toString()}`);
      setData(res.data.data);
      setGrandTotal(res.data.grand_total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Laporan Kerugian
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kerugian dari stok expired/rusak berdasarkan harga bahan
          </p>
        </div>
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (filters.branch_id) params.append("branch_id", filters.branch_id);
            if (filters.start_date) params.append("start_date", filters.start_date);
            if (filters.end_date) params.append("end_date", filters.end_date);
            const qs = params.toString();
            downloadCsv(`/api/export/loss-report${qs ? `?${qs}` : ""}`, "loss-report-export.csv");
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-[13px]">Cabang</Label>
            <Select value={filters.branch_id || "all"} onValueChange={(val) => setFilters({ ...filters, branch_id: !val || val === "all" ? "" : val })}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px]">Dari Tanggal</Label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px]">Sampai Tanggal</Label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-expired/10">
            <Receipt className="h-5 w-5 text-status-expired" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Total Kerugian</p>
            <p className="text-[20px] font-bold text-status-expired">{formatRupiah(grandTotal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Receipt className="mb-2 h-8 w-8 text-ink-muted/30" />
            Tidak ada data kerugian
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Bahan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Satuan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Harga/Unit</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Total Qty</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Jumlah Transaksi</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Total Kerugian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {item.item_name}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {item.unit}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted text-right">
                    {formatRupiah(item.cost_price)}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted text-right">
                    {item.total_quantity}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted text-right">
                    {item.movements_count}x
                  </TableCell>
                  <TableCell className="text-[13px] font-semibold text-status-expired text-right">
                    {formatRupiah(item.total_loss)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-secondary/50">
                <TableCell colSpan={5} className="text-[13px] font-semibold text-ink">
                  Total Kerugian
                </TableCell>
                <TableCell className="text-[14px] font-bold text-status-expired text-right">
                  {formatRupiah(grandTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
