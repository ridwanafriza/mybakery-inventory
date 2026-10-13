"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type {
  PurchaseOrder,
  Supplier,
  Item,
  PurchaseOrderItem,
  StockPrediction,
} from "@/lib/types";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2, Send, CheckCircle, Eye, Search, Hourglass, ShoppingCart } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-status-lowstock bg-status-lowstock/10" },
  sent: { label: "Terkirim", color: "text-status-expired bg-status-expired/10" },
  received: { label: "Diterima", color: "text-status-good bg-status-good/10" },
};

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    supplier_id: "",
    branch_id: String(user?.branch_id || ""),
    notes: "",
  });
  const [poItems, setPoItems] = useState<
    Array<{ item_id: string; quantity: string; unit_price: string }>
  >([{ item_id: "", quantity: "", unit_price: "" }]);

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";
  const canDelete = user?.role === "super_admin";
  const canApprove = user?.role === "super_admin";

  const fetchPurchaseOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      const res = await api.get(`/api/purchase-orders?${params.toString()}`);
      setPurchaseOrders(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    const [supRes, itemRes] = await Promise.all([
      api.get("/api/suppliers"),
      api.get("/api/items"),
    ]);
    setSuppliers(supRes.data.data);
    setItems(itemRes.data.data);
  };

  const fetchReorderSuggestions = async () => {
    try {
      const params = selectedBranchId ? `?branch_id=${selectedBranchId}` : "";
      const res = await api.get(`/api/stock-predictions/reorder${params}`);
      setReorderSuggestions(res.data.data ?? []);
    } catch {
      setReorderSuggestions([]);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [filterStatus]);

  useEffect(() => {
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchReorderSuggestions();
  }, [selectedBranchId]);

  const filteredPOs = useMemo(() => {
    if (!searchQuery.trim()) return purchaseOrders;
    const fuse = new Fuse(purchaseOrders, {
      keys: ["id", "supplier.name", "branch.name", "status"],
      threshold: 0.4,
      getFn: (item: PurchaseOrder) => {
        const parts: string[] = [`#${item.id}`, item.supplier?.name || "", item.branch?.name || "", STATUS_LABELS[item.status]?.label || item.status];
        if (item.notes) parts.push(item.notes);
        return parts.join(" ");
      },
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [purchaseOrders, searchQuery]);

  const openCreate = () => {
    setFormData({
      supplier_id: "",
      branch_id: String(user?.branch_id || selectedBranchId || ""),
      notes: "",
    });
    setPoItems([{ item_id: "", quantity: "", unit_price: "" }]);
    setError("");
    setDialogOpen(true);
  };

  /** Prefill draft PO dari Saran Pemesanan — TIDAK langsung submit/approve (SECURITY.md §4b). */
  const openPrefillPO = (s: StockPrediction) => {
    const item = items.find((i) => i.id === s.item_id);
    const unitPrice =
      user?.role === "super_admin" && item?.cost_price
        ? String(item.cost_price)
        : "";

    setFormData({
      supplier_id: s.default_supplier_id ? String(s.default_supplier_id) : "",
      branch_id: String(s.branch_id),
      notes: `Restock otomatis dari Saran Pemesanan — ${s.item_name}`,
    });
    setPoItems([
      {
        item_id: String(s.item_id),
        quantity: String(s.suggested_quantity ?? s.reorder_point ?? ""),
        unit_price: unitPrice,
      },
    ]);
    setError("");
    setDialogOpen(true);
  };

  const openDetail = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDetailOpen(true);
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { item_id: "", quantity: "", unit_price: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: "item_id" | "quantity" | "unit_price",
    value: string
  ) => {
    const updated = [...poItems];
    updated[index][field] = value;

    if (field === "item_id" && value) {
      const item = items.find((i) => i.id === Number(value));
      if (item?.cost_price) {
        updated[index].unit_price = String(item.cost_price);
      }
    }

    setPoItems(updated);
  };

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      setError("Pilih supplier terlebih dahulu");
      return;
    }
    if (!formData.branch_id) {
      setError("Pilih cabang terlebih dahulu");
      return;
    }
    const validItems = poItems.filter(
      (item) => item.item_id && item.quantity && item.unit_price
    );
    if (validItems.length === 0) {
      setError("Tambahkan minimal satu item");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/purchase-orders", {
        supplier_id: Number(formData.supplier_id),
        branch_id: Number(formData.branch_id),
        notes: formData.notes || null,
        items: validItems.map((item) => ({
          item_id: Number(item.item_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
      setDialogOpen(false);
      fetchPurchaseOrders();
      fetchReorderSuggestions();
      toast.success("Purchase order berhasil dibuat");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    poId: number,
    newStatus: string
  ) => {
    await api.put(`/api/purchase-orders/${poId}/status`, {
      status: newStatus,
    });
    const label = newStatus === "sent" ? "dikirim ke supplier" : "diterima";
    toast.success(`PO berhasil ditandai ${label}`);
    fetchPurchaseOrders();
    if (selectedPO?.id === poId) {
      const res = await api.get(`/api/purchase-orders/${poId}`);
      setSelectedPO(res.data.data);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/purchase-orders/${deleteId}`);
      toast.success("Purchase order berhasil dihapus");
      setDeleteId(null);
      fetchPurchaseOrders();
    } catch {
      toast.error("Gagal menghapus purchase order");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Purchase Order
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola permintaan pembelian bahan baku ({filteredPOs.length})
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Buat PO
          </Button>
        )}
      </div>

      {/* Saran Pemesanan (Fase 15) — hanya prefill draft, alur approve tetap Fase 8 */}
      {(loading || reorderSuggestions.length > 0) && canEdit && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 mb-1">
            <Hourglass className="h-4 w-4 text-status-low" strokeWidth={1.75} />
            <h2 className="text-[15px] font-semibold text-ink">Saran Pemesanan</h2>
          </div>
          <p className="text-[12px] text-ink-muted mb-4">
            Item yang stoknya sudah di bawah reorder point berdasarkan rata-rata pemakaian.
            Tombol &quot;Buat PO&quot; hanya mengisi form draft — tetap review &amp; approve manual.
          </p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-line" />
                    <div className="h-2.5 w-20 rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : reorderSuggestions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Item</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Cabang</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Stok</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right hidden sm:table-cell">Reorder Point</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Qty Saran</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Supplier</th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderSuggestions.map((s) => (
                    <tr key={`${s.branch_id}:${s.item_id}`} className="border-t border-line/50">
                      <td className="py-2.5 text-[13px] font-medium text-ink">
                        {s.item_name}
                        <span className="block text-[11px] font-normal text-ink-muted lg:hidden">
                          {s.default_supplier_name || "Tanpa supplier"}
                        </span>
                      </td>
                      <td className="py-2.5 text-[13px] text-ink-muted hidden md:table-cell">{s.branch_name}</td>
                      <td className="py-2.5 text-[13px] text-ink text-right">{s.quantity.toLocaleString()} {s.unit}</td>
                      <td className="py-2.5 text-[13px] text-ink-muted text-right hidden sm:table-cell">
                        {s.reorder_point?.toLocaleString() ?? "—"}
                      </td>
                      <td className="py-2.5 text-[13px] font-medium text-ink text-right">
                        {s.suggested_quantity?.toLocaleString() ?? "—"} {s.unit}
                      </td>
                      <td className="py-2.5 text-[13px] text-ink-muted hidden lg:table-cell">
                        {s.default_supplier_name || "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[12px]"
                          onClick={() => openPrefillPO(s)}
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" strokeWidth={1.75} />
                          Buat PO
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-3 text-[13px] text-ink-muted">Tidak ada item yang perlu segera dipesan.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari PO, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(val) => {
            setFilterStatus(val ?? "all");
            setLoading(true);
          }}
        >
          <SelectTrigger className="w-40 h-8 text-[13px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Terkirim</SelectItem>
            <SelectItem value="received">Diterima</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filteredPOs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <ClipboardList className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada purchase order
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  No. PO
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">
                  Supplier
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">
                  Cabang
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Total
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">
                  Tanggal
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.map((po) => {
                const statusStyle = STATUS_LABELS[po.status] || STATUS_LABELS.draft;
                return (
                  <TableRow key={po.id}>
                    <TableCell className="text-[13px] font-medium text-ink">
                      #{po.id}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted hidden sm:table-cell">
                      {po.supplier?.name || "-"}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted hidden md:table-cell">
                      {po.branch?.name || "-"}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink text-right font-medium">
                      {formatRupiah(po.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusStyle.color}`}
                      >
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">
                      {new Date(po.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDetail(po)}
                        >
                          <Eye className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                        </Button>
                        {canApprove && po.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStatusUpdate(po.id, "sent")}
                          >
                            <Send className="h-3.5 w-3.5 text-status-lowstock" strokeWidth={1.75} />
                          </Button>
                        )}
                        {canApprove && po.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStatusUpdate(po.id, "received")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-status-good" strokeWidth={1.75} />
                          </Button>
                        )}
                        {canDelete && po.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteId(po.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-status-expired" strokeWidth={1.75} />
                          </Button>
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

      {/* Create PO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Buat Purchase Order Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px]">Supplier *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(val) =>
                    setFormData({ ...formData, supplier_id: val ?? "" })
                  }
                >
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Catatan</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Catatan PO (opsional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold">Item</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-[12px] text-accent"
                >
                  <Plus className="mr-1 h-3 w-3" /> Tambah Item
                </Button>
              </div>
              <div className="space-y-2">
                {poItems.map((poItem, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={poItem.item_id}
                      onValueChange={(val) =>
                        handleItemChange(index, "item_id", val ?? "")
                      }
                    >
                      <SelectTrigger className="flex-1 h-8 text-[13px]">
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
                    <Input
                      type="number"
                      className="w-24 h-8 text-[13px]"
                      placeholder="Qty"
                      value={poItem.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      className="w-32 h-8 text-[13px]"
                      placeholder="Harga satuan"
                      value={poItem.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, "unit_price", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveItem(index)}
                      disabled={poItems.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-secondary/50 px-4 py-2 text-right">
              <span className="text-[12px] text-ink-muted">Total: </span>
              <span className="text-[15px] font-semibold text-ink">
                {formatRupiah(
                  poItems.reduce((sum, item) => {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unit_price) || 0;
                    return sum + qty * price;
                  }, 0)
                )}
              </span>
            </div>

            {error && (
              <p className="text-[13px] text-status-expired">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-accent hover:bg-accent/90"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Simpan PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail PO Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Detail PO #{selectedPO?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-ink-muted">Supplier</span>
                  <p className="font-medium text-ink">{selectedPO.supplier?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-ink-muted">Cabang</span>
                  <p className="font-medium text-ink">{selectedPO.branch?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-ink-muted">Status</span>
                  <p>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_LABELS[selectedPO.status]?.color || ""}`}
                    >
                      {STATUS_LABELS[selectedPO.status]?.label || selectedPO.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Tanggal</span>
                  <p className="font-medium text-ink">
                    {new Date(selectedPO.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="text-[13px]">
                  <span className="text-ink-muted">Catatan</span>
                  <p className="font-medium text-ink">{selectedPO.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[13px] font-semibold">Item</Label>
                <div className="rounded-lg border border-line">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          Item
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Harga Satuan
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Subtotal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((poItem: PurchaseOrderItem) => (
                        <TableRow key={poItem.id}>
                          <TableCell className="text-[13px] font-medium text-ink">
                            {poItem.item?.name || "-"}
                          </TableCell>
                          <TableCell className="text-[13px] text-ink-muted text-right">
                            {poItem.quantity}
                          </TableCell>
                          <TableCell className="text-[13px] text-ink-muted text-right">
                            {formatRupiah(poItem.unit_price)}
                          </TableCell>
                          <TableCell className="text-[13px] text-ink text-right font-medium">
                            {formatRupiah(poItem.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-right">
                  <span className="text-[12px] text-ink-muted">Total: </span>
                  <span className="text-[15px] font-semibold text-ink">
                    {formatRupiah(selectedPO.total)}
                  </span>
                </div>
              </div>

              {canApprove && selectedPO.status === "draft" && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedPO.id, "sent");
                    setDetailOpen(false);
                  }}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Kirim ke Supplier
                </Button>
              )}
              {canApprove && selectedPO.status === "sent" && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedPO.id, "received");
                    setDetailOpen(false);
                  }}
                  className="w-full bg-status-good hover:bg-status-good/90"
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Tandai Diterima
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus Purchase Order"
        description="Apakah Anda yakin ingin menghapus purchase order ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
