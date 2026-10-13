"use client";

import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { ActivityLog, User } from "@/lib/types";
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
  History,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Pencil,
  Plus,
  Send,
  CheckCircle,
  ArrowRightLeft,
  ClipboardCheck,
  ShoppingCart,
  Factory,
} from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  item_created: { label: "Menambah item", icon: Plus, color: "text-status-good bg-status-good/10" },
  item_updated: { label: "Mengubah item", icon: Pencil, color: "text-status-lowstock bg-status-lowstock/10" },
  item_deleted: { label: "Menghapus item", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  category_created: { label: "Menambah kategori", icon: Plus, color: "text-status-good bg-status-good/10" },
  category_updated: { label: "Mengubah kategori", icon: Pencil, color: "text-status-lowstock bg-status-lowstock/10" },
  category_deleted: { label: "Menghapus kategori", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  recipe_created: { label: "Menambah resep", icon: Plus, color: "text-status-good bg-status-good/10" },
  recipe_updated: { label: "Mengubah resep", icon: Pencil, color: "text-status-lowstock bg-status-lowstock/10" },
  recipe_deleted: { label: "Menghapus resep", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  supplier_created: { label: "Menambah supplier", icon: Plus, color: "text-status-good bg-status-good/10" },
  supplier_updated: { label: "Mengubah supplier", icon: Pencil, color: "text-status-lowstock bg-status-lowstock/10" },
  supplier_deleted: { label: "Menghapus supplier", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  po_created: { label: "Membuat PO", icon: ShoppingCart, color: "text-accent bg-accent/10" },
  po_status_updated: { label: "Update status PO", icon: Send, color: "text-status-lowstock bg-status-lowstock/10" },
  po_deleted: { label: "Menghapus PO", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  transfer_created: { label: "Membuat transfer stok", icon: ArrowRightLeft, color: "text-accent bg-accent/10" },
  transfer_approved: { label: "Menyetujui transfer", icon: CheckCircle, color: "text-status-good bg-status-good/10" },
  transfer_received: { label: "Menerima transfer", icon: CheckCircle, color: "text-status-good bg-status-good/10" },
  transfer_deleted: { label: "Membatalkan transfer", icon: Trash2, color: "text-status-expired bg-status-expired/10" },
  stock_opname_created: { label: "Membuat sesi opname", icon: ClipboardCheck, color: "text-accent bg-accent/10" },
  stock_opname_submitted: { label: "Submit opname", icon: Send, color: "text-status-lowstock bg-status-lowstock/10" },
  stock_opname_approved: { label: "Menyetujui opname", icon: CheckCircle, color: "text-status-good bg-status-good/10" },
  production_recorded: { label: "Mencatat produksi", icon: Factory, color: "text-accent bg-accent/10" },
};

const ACTION_GROUPS: Record<string, string[]> = {
  "Item": ["item_created", "item_updated", "item_deleted"],
  "Kategori": ["category_created", "category_updated", "category_deleted"],
  "Resep": ["recipe_created", "recipe_updated", "recipe_deleted"],
  "Supplier": ["supplier_created", "supplier_updated", "supplier_deleted"],
  "Purchase Order": ["po_created", "po_status_updated", "po_deleted"],
  "Transfer Stok": ["transfer_created", "transfer_approved", "transfer_received", "transfer_deleted"],
  "Stock Opname": ["stock_opname_created", "stock_opname_submitted", "stock_opname_approved"],
  "Catat Produksi": ["production_recorded"],
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/api/staff").then((res) => setUsers(res.data.data));
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filterUser !== "all") params.set("user_id", filterUser);
      if (filterAction !== "all") params.set("action", filterAction);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      const res = await api.get(`/api/activity-logs?${params.toString()}`);
      setLogs(res.data.data);
      setLastPage(res.data.meta.last_page);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterUser, filterAction, fromDate, toDate]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const fuse = new Fuse(logs, {
      keys: ["user.name", "action"],
      threshold: 0.4,
      getFn: (item: ActivityLog) => {
        const actionInfo = ACTION_LABELS[item.action];
        return [item.user?.name || "", actionInfo?.label || item.action, item.data?.name || "", item.data?.supplier || ""].join(" ");
      },
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [logs, searchQuery]);

  const resetFilters = () => {
    setFilterUser("all");
    setFilterAction("all");
    setFromDate("");
    setToDate("");
    setSearchQuery("");
    setPage(1);
  };

  const formatData = (data: Record<string, unknown> | null): string => {
    if (!data) return "";
    const parts: string[] = [];
    if (data.name) parts.push(String(data.name));
    if (data.supplier) parts.push(`Supplier: ${data.supplier}`);
    if (data.branch) parts.push(`Cabang: ${data.branch}`);
    if (data.from && data.to) parts.push(`${data.from} → ${data.to}`);
    if (data.old_status && data.new_status) parts.push(`${data.old_status} → ${data.new_status}`);
    if (data.items_count) parts.push(`${data.items_count} item`);
    return parts.join(", ");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Activity Log</h1>
          <p className="text-[13px] text-ink-muted">
            Riwayat aktivitas pengguna sistem ({total} entri)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari aktivitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">Pengguna</Label>
          <Select value={filterUser} onValueChange={(v) => { setFilterUser(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
              <SelectValue placeholder="Semua Pengguna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pengguna</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">Jenis Aksi</Label>
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-[13px]">
              <SelectValue placeholder="Semua Aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-[11px] font-semibold text-ink-muted">{group}</div>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]?.label || action}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">Dari Tanggal</Label>
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="h-8 w-[150px] text-[13px]" />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-ink-muted">Sampai Tanggal</Label>
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="h-8 w-[150px] text-[13px]" />
        </div>

        <Button variant="outline" onClick={resetFilters} className="h-8 text-[13px]">Reset</Button>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <History className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada aktivitas tercatat
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Waktu</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Pengguna</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Aksi</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: History, color: "text-ink-muted bg-secondary" };
                  const Icon = actionInfo.icon;
                  const detail = formatData(log.data);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-[13px] text-ink-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}{" "}
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-[13px] font-medium text-ink">
                        {log.user?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${actionInfo.color}`}>
                          <Icon className="h-3 w-3" strokeWidth={1.75} />
                          {actionInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-ink-muted hidden md:table-cell max-w-[250px] truncate">
                        {detail || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {lastPage > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-[13px] text-ink-muted">
                  Halaman {page} dari {lastPage}
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage}>
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
