"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { StockBatch, Item, Branch } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Layers, Plus, Trash2, Search, AlertTriangle } from "lucide-react";

export default function StockBatchesPage() {
  const { user } = useAuth();
  const { selectedBranchId, branches: contextBranches } = useBranch();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Create batch state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    item_id: "all",
    branch_id: "all",
    quantity: "",
    production_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    storage_location: "pantry",
    cost_price: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dispose state
  const [disposeId, setDisposeId] = useState<number | null>(null);
  const [disposing, setDisposing] = useState(false);

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";

  const fetchBatches = async () => {
    try {
      const res = await api.get("/api/stock-batches");
      setBatches(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    const [itemsRes, branchesRes] = await Promise.all([
      api.get("/api/items"),
      api.get("/api/branches"),
    ]);
    setItems(itemsRes.data.data);
    setBranches(branchesRes.data.data);
  };

  useEffect(() => {
    fetchBatches();
    fetchData();
  }, []);

  const filteredBatches = useMemo(() => {
    let result = batches;
    if (filterStatus !== "all") {
      result = result.filter((b) => b.status === filterStatus);
    }
    if (!searchQuery.trim()) return result;
    const fuse = new Fuse(result, { keys: ["batch_code", "item.name"], threshold: 0.4 });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [batches, searchQuery, filterStatus]);

  const openCreate = () => {
    setForm({
      item_id: "all",
      branch_id: selectedBranchId ? String(selectedBranchId) : "all",
      quantity: "",
      production_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      storage_location: "pantry",
      cost_price: "",
    });
    setError("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (form.item_id === "all" || form.branch_id === "all" || !form.quantity || !form.cost_price) {
      setError("Semua field wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/stock-batches", {
        item_id: parseInt(form.item_id),
        branch_id: parseInt(form.branch_id),
        quantity: parseFloat(form.quantity),
        production_date: form.production_date,
        expiry_date: form.expiry_date || null,
        storage_location: form.storage_location,
        cost_price: parseFloat(form.cost_price),
      });
      toast.success("Batch berhasil ditambahkan");
      setCreateOpen(false);
      fetchBatches();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal menambahkan batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispose = async () => {
    if (!disposeId) return;
    setDisposing(true);
    try {
      await api.put(`/api/stock-batches/${disposeId}/dispose`, { reason: "expired" });
      toast.success("Batch berhasil didisposisi");
      setDisposeId(null);
      fetchBatches();
    } catch {
      toast.error("Gagal mendisposisi batch");
    } finally {
      setDisposing(false);
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (batch: StockBatch) => {
    const now = new Date();
    const expiry = batch.expiry_date ? new Date(batch.expiry_date) : null;
    const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (batch.status === "disposed") {
      return <Badge className="bg-ink-muted/10 text-ink-muted border-ink-muted/20 text-[11px]">Disposed</Badge>;
    }
    if (batch.status === "depleted") {
      return <Badge className="bg-ink-muted/10 text-ink-muted border-ink-muted/20 text-[11px]">Habis</Badge>;
    }
    if (batch.status === "expired" || (expiry && expiry < now)) {
      return <Badge className="bg-status-expired/10 text-status-expired border-status-expired/20 text-[11px]">Expired</Badge>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      return <Badge className="bg-status-low/10 text-status-low border-status-low/20 text-[11px]">Exp. {daysUntilExpiry}h</Badge>;
    }
    return <Badge className="bg-status-good/10 text-status-good border-status-good/20 text-[11px]">Aktif</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Batch Stok</h1>
          <p className="text-[13px] text-ink-muted">
            Kelola batch bahan baku — FIFO tracking ({filteredBatches.length} batch)
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Tambah Batch
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-[13px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="depleted">Habis</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Layers className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada batch
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Batch Code</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Item</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">Cabang</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Qty</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Produksi</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Expiry</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-center">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right w-[50px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-[12px] font-semibold text-ink">{batch.batch_code}</TableCell>
                  <TableCell>
                    <span className="text-[13px] font-medium text-ink">{batch.item?.name}</span>
                    <span className="block text-[11px] text-ink-muted">{batch.item?.unit}</span>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden sm:table-cell">{batch.branch?.name}</TableCell>
                  <TableCell className="text-right text-[13px] font-semibold text-ink">
                    {batch.quantity} {batch.item?.unit}
                  </TableCell>
                  <TableCell className="text-[12px] text-ink-muted hidden md:table-cell">{formatDate(batch.production_date)}</TableCell>
                  <TableCell className="text-[12px] text-ink-muted hidden md:table-cell">
                    {batch.expiry_date ? formatDate(batch.expiry_date) : "-"}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(batch)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && batch.status === "active" && batch.quantity > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDisposeId(batch.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-status-expired" strokeWidth={1.75} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">Tambah Batch Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Item</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v ?? "all" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Cabang</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v ?? "all" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px]">Jumlah</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Harga/Unit (Rp)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px]">Tanggal Produksi</Label>
                <Input
                  type="date"
                  value={form.production_date}
                  onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Tanggal Expiry</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Lokasi Penyimpanan</Label>
              <Input
                value={form.storage_location}
                onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                placeholder="pantry"
              />
            </div>
            {error && <p className="text-[13px] text-status-expired">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-accent hover:bg-accent/90">
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={disposeId !== null}
        onOpenChange={(open) => { if (!open) setDisposeId(null); }}
        title="Disposisi Batch"
        description="Batch yang didisposisi tidak dapat dikembalikan. Stok akan dikurangi sesuai jumlah batch."
        onConfirm={handleDispose}
        variant="danger"
        confirmText="Disposisi"
        loading={disposing}
      />
    </div>
  );
}
