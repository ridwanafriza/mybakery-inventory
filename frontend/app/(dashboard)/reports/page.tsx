"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import type { StockMovement, Branch } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ReportsPage() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    api.get("/api/branches").then((res) => setBranches(res.data.data));
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filterBranch !== "all") params.set("branch_id", filterBranch);
      if (filterType !== "all") params.set("type", filterType);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      const res = await api.get(`/api/stock-movements?${params.toString()}`);
      setMovements(res.data.data);
      setLastPage(res.data.meta.last_page);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page, filterBranch, filterType, fromDate, toDate]);

  useEffect(() => {
    if (selectedBranchId) {
      setFilterBranch(String(selectedBranchId));
    } else if (user?.role === "super_admin") {
      setFilterBranch("all");
    }
  }, [selectedBranchId, user]);

  const resetFilters = () => {
    setFilterBranch(selectedBranchId ? String(selectedBranchId) : "all");
    setFilterType("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Laporan</h1>
          <p className="text-[13px] text-ink-muted">
            Riwayat pergerakan stok
          </p>
        </div>
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (filterBranch !== "all") params.append("branch_id", filterBranch);
            if (filterType !== "all") params.append("type", filterType);
            if (fromDate) params.append("from_date", fromDate);
            if (toDate) params.append("to_date", toDate);
            const qs = params.toString();
            downloadCsv(`/api/export/stock-movements${qs ? `?${qs}` : ""}`, "stock-movements-export.csv");
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {branches.length > 1 && (
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-ink-muted">
              Cabang
            </Label>
            <Select
              value={filterBranch}
              onValueChange={(v) => {
                setFilterBranch(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">
            Tipe
          </Label>
          <Select
            value={filterType}
            onValueChange={(v) => {
              setFilterType(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-[13px]">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="in">Stok Masuk</SelectItem>
              <SelectItem value="out">Stok Keluar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">
            Dari Tanggal
          </Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[160px] text-[13px]"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">
            Sampai Tanggal
          </Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[160px] text-[13px]"
          />
        </div>

        <Button
          variant="outline"
          onClick={resetFilters}
          className="h-8 text-[13px]"
        >
          Reset
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <FileText className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada riwayat pergerakan stok
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Tanggal
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Item
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">
                    Cabang
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">
                    Tipe
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                    Jumlah
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">
                    Catatan
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">
                    Oleh
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-[13px] text-ink-muted">
                      {new Date(m.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-ink">
                      <div className="flex items-center gap-2">
                        {m.type === "in" ? (
                          <ArrowDownToLine
                            className="h-3.5 w-3.5 text-status-good"
                            strokeWidth={1.75}
                          />
                        ) : (
                          <ArrowUpFromLine
                            className="h-3.5 w-3.5 text-status-expired"
                            strokeWidth={1.75}
                          />
                        )}
                        {m.item?.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted hidden sm:table-cell">
                      {m.branch?.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.type === "in" ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-good">
                          <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                          Masuk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-expired">
                          <span className="h-1.5 w-1.5 rounded-full bg-status-expired" />
                          Keluar
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[13px] font-medium text-ink">
                      {m.type === "in" ? "+" : "-"}
                      {m.quantity} {m.item?.unit}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted max-w-[200px] truncate hidden lg:table-cell">
                      {m.note || "—"}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">
                      {m.user?.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {lastPage > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-[13px] text-ink-muted">
                  Halaman {page} dari {lastPage}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setPage((p) => Math.min(lastPage, p + 1))
                    }
                    disabled={page === lastPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
