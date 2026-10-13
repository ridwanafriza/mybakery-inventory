"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { StockTransfer, Branch, Item } from "@/lib/types";
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
import { TableSkeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowRightLeft, Plus, Eye, Check, PackageCheck, X, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu", color: "bg-status-low/10 text-status-low" },
  approved: { label: "Disetujui", color: "bg-accent/10 text-accent" },
  received: { label: "Diterima", color: "bg-status-good/10 text-status-good" },
  rejected: { label: "Dibatalkan", color: "bg-status-out/10 text-status-out" },
};

export default function TransferStokPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    from_branch_id: "",
    to_branch_id: "",
    notes: "",
    items: [{ item_id: "", quantity: "" }] as { item_id: string; quantity: string }[],
  });
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<StockTransfer | null>(null);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: number } | null>(null);

  const isSuperAdmin = user?.role === "super_admin";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transferRes, branchRes, itemRes] = await Promise.all([
        api.get("/api/stock-transfers"),
        api.get("/api/branches"),
        api.get("/api/items"),
      ]);
      setTransfers(transferRes.data.data);
      setBranches(branchRes.data.data);
      setItems(itemRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!createForm.from_branch_id || !createForm.to_branch_id) {
      toast.error("Pilih cabang asal dan tujuan");
      return;
    }
    const validItems = createForm.items.filter((i) => i.item_id && i.quantity);
    if (validItems.length === 0) {
      toast.error("Minimal satu item harus ditambahkan");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/stock-transfers", {
        from_branch_id: createForm.from_branch_id,
        to_branch_id: createForm.to_branch_id,
        notes: createForm.notes,
        items: validItems.map((i) => ({
          item_id: i.item_id,
          quantity: parseFloat(i.quantity),
        })),
      });
      toast.success("Transfer stok berhasil dibuat");
      setCreateOpen(false);
      setCreateForm({ from_branch_id: "", to_branch_id: "", notes: "", items: [{ item_id: "", quantity: "" }] });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat transfer";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/api/stock-transfers/${id}/approve`);
      toast.success("Transfer disetujui");
      fetchData();
    } catch {
      toast.error("Gagal menyetujui transfer");
    }
    setConfirmAction(null);
  };

  const handleReceived = async (id: number) => {
    try {
      await api.put(`/api/stock-transfers/${id}/received`);
      toast.success("Transfer diterima, stok telah diperbarui");
      fetchData();
    } catch {
      toast.error("Gagal menerima transfer");
    }
    setConfirmAction(null);
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/api/stock-transfers/${id}/reject`);
      toast.success("Transfer ditolak");
      fetchData();
    } catch {
      toast.error("Gagal menolak transfer");
    }
    setConfirmAction(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/stock-transfers/${id}`);
      toast.success("Transfer dibatalkan");
      fetchData();
    } catch {
      toast.error("Gagal membatalkan transfer");
    }
    setConfirmAction(null);
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await api.get(`/api/stock-transfers/${id}`);
      setDetail(res.data.data);
      setDetailOpen(true);
    } catch {
      toast.error("Gagal memuat detail");
    }
  };

  const canApprove = (t: StockTransfer) => {
    if (t.status !== "pending") return false;
    if (isSuperAdmin) return true;
    return user?.role === "branch_admin" && t.to_branch_id === user?.branch_id;
  };

  const canReceive = (t: StockTransfer) => {
    if (t.status !== "approved") return false;
    if (isSuperAdmin) return true;
    return user?.role === "branch_admin" && t.to_branch_id === user?.branch_id;
  };

  const canReject = (t: StockTransfer) => {
    if (t.status !== "pending") return false;
    if (isSuperAdmin) return true;
    return user?.role === "branch_admin" && t.to_branch_id === user?.branch_id;
  };

  const canDelete = (t: StockTransfer) => {
    if (t.status !== "pending") return false;
    if (isSuperAdmin) return true;
    return user?.role === "branch_admin" && t.from_branch_id === user?.branch_id;
  };

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Transfer Stok</h1>
          <p className="text-[13px] text-ink-muted">Transfer bahan antar cabang</p>
        </div>
        {(isSuperAdmin || user?.role === "branch_admin") && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Buat Transfer
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-3">
              <ArrowRightLeft className="h-6 w-6 text-accent" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] font-medium text-ink">Belum ada transfer</p>
            <p className="text-[11px] text-ink-muted">Buat transfer baru untuk mulai</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Dari</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Ke</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Item</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Tanggal</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => {
                const st = STATUS_LABEL[t.status] || STATUS_LABEL.pending;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-[13px]">{t.from_branch?.name ?? "—"}</TableCell>
                    <TableCell className="text-[13px]">{t.to_branch?.name ?? "—"}</TableCell>
                    <TableCell className="text-[13px]">{t.items.length} item</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted">{t.created_at}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewDetail(t.id)} className="rounded-lg p-1.5 text-ink-muted hover:bg-secondary" title="Detail">
                          <Eye className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        {canApprove(t) && (
                          <button onClick={() => setConfirmAction({ type: "approve", id: t.id })} className="rounded-lg p-1.5 text-accent hover:bg-accent/10" title="Setuju">
                            <Check className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        )}
                        {canReject(t) && (
                          <button onClick={() => setConfirmAction({ type: "reject", id: t.id })} className="rounded-lg p-1.5 text-status-expired hover:bg-status-expired/10" title="Tolak">
                            <XCircle className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        )}
                        {canReceive(t) && (
                          <button onClick={() => setConfirmAction({ type: "received", id: t.id })} className="rounded-lg p-1.5 text-status-good hover:bg-status-good/10" title="Terima">
                            <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        )}
                        {canDelete(t) && (
                          <button onClick={() => setConfirmAction({ type: "delete", id: t.id })} className="rounded-lg p-1.5 text-status-expired hover:bg-status-expired/10" title="Batalkan">
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">Buat Transfer Stok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px]">Cabang Asal</Label>
                <Select value={createForm.from_branch_id} onValueChange={(val) => setCreateForm({ ...createForm, from_branch_id: val ?? "" })}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Cabang Tujuan</Label>
                <Select value={createForm.to_branch_id} onValueChange={(val) => setCreateForm({ ...createForm, to_branch_id: val ?? "" })}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter((b) => String(b.id) !== createForm.from_branch_id).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Catatan</Label>
              <Input
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Catatan transfer (opsional)"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px]">Item</Label>
                <button
                  onClick={() => setCreateForm({ ...createForm, items: [...createForm.items, { item_id: "", quantity: "" }] })}
                  className="text-[12px] font-medium text-accent hover:underline"
                >
                  + Tambah Item
                </button>
              </div>
              {createForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select value={item.item_id} onValueChange={(val) => {
                    const newItems = [...createForm.items];
                    newItems[idx].item_id = val ?? "";
                    setCreateForm({ ...createForm, items: newItems });
                  }}>
                    <SelectTrigger className="flex-1 h-9 text-[13px]">
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...createForm.items];
                      newItems[idx].quantity = e.target.value;
                      setCreateForm({ ...createForm, items: newItems });
                    }}
                    placeholder="Qty"
                    className="w-24"
                  />
                  {createForm.items.length > 1 && (
                    <button
                      onClick={() => {
                        const newItems = createForm.items.filter((_, i) => i !== idx);
                        setCreateForm({ ...createForm, items: newItems });
                      }}
                      className="rounded-md p-1.5 text-status-expired hover:bg-status-expired/10"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-accent hover:bg-accent/90">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Buat Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">Detail Transfer</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <p className="text-ink-muted">Dari</p>
                  <p className="font-medium">{detail.from_branch?.name}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Ke</p>
                  <p className="font-medium">{detail.to_branch?.name}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Status</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_LABEL[detail.status]?.color}`}>
                    {STATUS_LABEL[detail.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-ink-muted">Dibuat oleh</p>
                  <p className="font-medium">{detail.user?.name}</p>
                </div>
              </div>
              {detail.notes && (
                <div className="text-[13px]">
                  <p className="text-ink-muted">Catatan</p>
                  <p>{detail.notes}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-[13px] text-ink-muted">Item</p>
                <div className="rounded-lg border border-line">
                  {detail.items.map((ti) => (
                    <div key={ti.id} className="flex items-center justify-between border-b border-line last:border-0 px-3 py-2">
                      <span className="text-[13px]">{ti.item?.name}</span>
                      <span className="text-[13px] font-medium">{ti.quantity} {ti.item?.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={
          confirmAction?.type === "approve" ? "Setujui Transfer?"
          : confirmAction?.type === "received" ? "Terima Transfer?"
          : confirmAction?.type === "reject" ? "Tolak Transfer?"
          : "Batalkan Transfer?"
        }
        description={
          confirmAction?.type === "approve" ? "Stok cabang asal akan dikurangi saat transfer diterima."
          : confirmAction?.type === "received" ? "Stok cabang asal akan dikurangi dan stok cabang tujuan akan bertambah."
          : confirmAction?.type === "reject" ? "Transfer akan ditolak dan tidak dapat diproses lagi."
          : "Transfer akan dibatalkan secara permanen."
        }
        confirmText={
          confirmAction?.type === "approve" ? "Setujui"
          : confirmAction?.type === "received" ? "Terima"
          : confirmAction?.type === "reject" ? "Tolak"
          : "Batalkan"
        }
        variant={confirmAction?.type === "delete" || confirmAction?.type === "reject" ? "danger" : "default"}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "approve") handleApprove(confirmAction.id);
          else if (confirmAction.type === "received") handleReceived(confirmAction.id);
          else if (confirmAction.type === "reject") handleReject(confirmAction.id);
          else handleDelete(confirmAction.id);
        }}
      />
    </div>
  );
}
