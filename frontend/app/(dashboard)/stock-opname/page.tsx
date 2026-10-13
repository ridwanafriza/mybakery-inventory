"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type {
  StockOpname,
  StockOpnameItem,
  BranchStock,
  Branch,
  Item,
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
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Send,
  AlertTriangle,
  Search,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: {
    label: "Draft",
    color: "text-status-lowstock bg-status-lowstock/10",
  },
  pending_approval: {
    label: "Menunggu Approval",
    color: "text-status-lowstock bg-status-lowstock/10",
  },
  approved: {
    label: "Disetujui",
    color: "text-status-good bg-status-good/10",
  },
};

export default function StockOpnamePage() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBranch, setFilterBranchState] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    String(user?.branch_id || "")
  );
  const [opnameNotes, setOpnameNotes] = useState("");
  const [opnameItems, setOpnameItems] = useState<
    Array<{ item_id: string; item_name: string; unit: string; qty_system: string; qty_fisik: string }>
  >([]);

  const canCreate = true;
  const canApprove = user?.role === "super_admin" || user?.role === "branch_admin";

  const fetchOpnames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterBranch !== "all") params.set("branch_id", filterBranch);
      const res = await api.get(`/api/stock-opnames?${params.toString()}`);
      setOpnames(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const res = await api.get("/api/branches");
    setBranches(res.data.data);
  };

  const fetchBranchStocks = async (branchId: string) => {
    if (!branchId) {
      setBranchStocks([]);
      return;
    }
    const res = await api.get(`/api/stock-overview?branch_id=${branchId}`);
    setBranchStocks(res.data.data);
  };

  useEffect(() => {
    fetchOpnames();
  }, [filterStatus, filterBranch]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchStocks(selectedBranch);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranchId) {
      setFilterBranchState(String(selectedBranchId));
    }
  }, [selectedBranchId]);

  const setFilterBranch = (val: string) => {
    setFilterBranchState(val || "all");
  };

  const filteredOpnames = useMemo(() => {
    if (!searchQuery.trim()) return opnames;
    const fuse = new Fuse(opnames, {
      keys: ["branch.name", "user.name", "status"],
      threshold: 0.4,
      getFn: (item: StockOpname) => {
        const parts: string[] = [`#${item.id}`, item.branch?.name || "", item.user?.name || "", STATUS_LABELS[item.status]?.label || item.status];
        if (item.notes) parts.push(item.notes);
        return parts.join(" ");
      },
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [opnames, searchQuery]);

  const openCreate = () => {
    setSelectedBranch(String(user?.branch_id || ""));
    setOpnameNotes("");
    setOpnameItems([]);
    setError("");
    setDialogOpen(true);
  };

  const openDetail = (opname: StockOpname) => {
    setSelectedOpname(opname);
    setDetailOpen(true);
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setOpnameItems([]);
  };

  const handleAddItem = (stock: BranchStock) => {
    if (opnameItems.some((i) => i.item_id === String(stock.item_id))) return;
    setOpnameItems([
      ...opnameItems,
      {
        item_id: String(stock.item_id),
        item_name: stock.item?.name || "",
        unit: stock.item?.unit || "",
        qty_system: String(stock.quantity),
        qty_fisik: String(stock.quantity),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOpnameItems(opnameItems.filter((_, i) => i !== index));
  };

  const handleQtyFisikChange = (index: number, value: string) => {
    const updated = [...opnameItems];
    updated[index].qty_fisik = value;
    setOpnameItems(updated);
  };

  const handleSubmitCreate = async () => {
    if (!selectedBranch) {
      setError("Pilih cabang terlebih dahulu");
      return;
    }
    if (opnameItems.length === 0) {
      setError("Tambahkan minimal satu item");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/stock-opnames", {
        branch_id: Number(selectedBranch),
        notes: opnameNotes || null,
        items: opnameItems.map((item) => ({
          item_id: Number(item.item_id),
          qty_fisik: Number(item.qty_fisik),
        })),
      });
      setDialogOpen(false);
      fetchOpnames();
      toast.success("Stock opname berhasil dibuat");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOpname = async (opnameId: number) => {
    if (!selectedOpname) return;

    setSubmitting(true);
    try {
      await api.put(`/api/stock-opnames/${opnameId}/submit`, {
        items: selectedOpname.items.map((item) => ({
          id: item.id,
          qty_fisik: item.qty_fisik ?? item.qty_system,
        })),
      });
      setDetailOpen(false);
      fetchOpnames();
      toast.success("Opname berhasil disubmit untuk approval");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOpname = async (opnameId: number) => {
    setSubmitting(true);
    try {
      await api.put(`/api/stock-opnames/${opnameId}/approve`);
      setDetailOpen(false);
      fetchOpnames();
      toast.success("Stock opname berhasil disetujui dan stok disinkronkan");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOpname = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/stock-opnames/${deleteId}`);
      toast.success("Stock opname berhasil dihapus");
      setDeleteId(null);
      fetchOpnames();
    } catch {
      toast.error("Gagal menghapus stock opname");
    } finally {
      setDeleting(false);
    }
  };

  const availableStocks = branchStocks.filter(
    (s) => !opnameItems.some((i) => i.item_id === String(s.item_id))
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Stock Opname
          </h1>
          <p className="text-[13px] text-ink-muted">
            Cek fisik stok dan bandingkan dengan data sistem ({filteredOpnames.length}{" "}
            sesi)
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Buat Opname
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari opname, cabang..."
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
          <SelectTrigger className="w-48 h-8 text-[13px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Menunggu Approval</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filteredOpnames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <ClipboardCheck className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada sesi stock opname
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  No. Opname
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Cabang
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Oleh
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Item
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Tanggal
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpnames.map((opname) => {
                const statusStyle =
                  STATUS_LABELS[opname.status] || STATUS_LABELS.draft;
                const hasDisc = opname.items?.some(
                  (i) => i.selisih !== null && i.selisih !== 0
                );
                return (
                  <TableRow key={opname.id}>
                    <TableCell className="text-[13px] font-medium text-ink">
                      #{opname.id}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted">
                      {opname.branch?.name || "-"}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted">
                      {opname.user?.name || "-"}
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted">
                      {opname.items?.length || 0} item
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusStyle.color}`}
                      >
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-ink-muted">
                      {new Date(opname.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDetail(opname)}
                        >
                          <Eye
                            className="h-3.5 w-3.5 text-ink-muted"
                            strokeWidth={1.75}
                          />
                        </Button>
                        {canApprove &&
                          opname.status === "pending_approval" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleApproveOpname(opname.id)}
                            >
                              <CheckCircle
                                className="h-3.5 w-3.5 text-status-good"
                                strokeWidth={1.75}
                              />
                            </Button>
                          )}
                        {user?.role === "super_admin" &&
                          opname.status !== "approved" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteId(opname.id)}
                            >
                              <Trash2
                                className="h-3.5 w-3.5 text-status-expired"
                                strokeWidth={1.75}
                              />
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

      {/* Create Opname Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Buat Stock Opname Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Cabang *</Label>
              <Select value={selectedBranch} onValueChange={(val) => handleBranchChange(val ?? "")}>
                <SelectTrigger className="h-9 text-[13px]">
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

            <div className="space-y-2">
              <Label className="text-[13px]">Catatan</Label>
              <Input
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                placeholder="Catatan opname (opsional)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold">
                  Item ({opnameItems.length})
                </Label>
              </div>

              {opnameItems.length > 0 && (
                <div className="rounded-lg border border-line">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          Item
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Stok Sistem
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Stok Fisik
                        </TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opnameItems.map((item, index) => {
                        const selisih =
                          (Number(item.qty_fisik) || 0) -
                          (Number(item.qty_system) || 0);
                        return (
                          <TableRow key={item.item_id}>
                            <TableCell className="text-[13px] font-medium text-ink">
                              {item.item_name}{" "}
                              <span className="text-ink-muted">
                                ({item.unit})
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-ink-muted text-right">
                              {item.qty_system}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="h-7 w-20 text-[13px] text-right"
                                value={item.qty_fisik}
                                onChange={(e) =>
                                  handleQtyFisikChange(index, e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2
                                  className="h-3.5 w-3.5 text-ink-muted"
                                  strokeWidth={1.75}
                                />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedBranch && availableStocks.length > 0 && (
                <Select onValueChange={(val) => {
                  const stock = availableStocks.find(
                    (s) => String(s.item_id) === val
                  );
                  if (stock) handleAddItem(stock);
                }}>
                  <SelectTrigger className="h-8 text-[13px]">
                    <SelectValue placeholder="+ Tambah item dari stok cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStocks.map((s) => (
                      <SelectItem
                        key={s.item_id}
                        value={String(s.item_id)}
                      >
                        {s.item?.name} — {s.quantity} {s.item?.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {!selectedBranch && (
                <p className="text-[12px] text-ink-muted">
                  Pilih cabang terlebih dahulu untuk melihat daftar stok
                </p>
              )}
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
              onClick={handleSubmitCreate}
              disabled={submitting}
              className="bg-accent hover:bg-accent/90"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Buat Opname"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Opname Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Detail Opname #{selectedOpname?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOpname && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-ink-muted">Cabang</span>
                  <p className="font-medium text-ink">
                    {selectedOpname.branch?.name || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Dibuat Oleh</span>
                  <p className="font-medium text-ink">
                    {selectedOpname.user?.name || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Status</span>
                  <p>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_LABELS[selectedOpname.status]?.color || ""}`}
                    >
                      {STATUS_LABELS[selectedOpname.status]?.label ||
                        selectedOpname.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Tanggal</span>
                  <p className="font-medium text-ink">
                    {new Date(selectedOpname.created_at).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>

              {selectedOpname.notes && (
                <div className="text-[13px]">
                  <span className="text-ink-muted">Catatan</span>
                  <p className="font-medium text-ink">
                    {selectedOpname.notes}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[13px] font-semibold">
                  Daftar Item
                </Label>
                <div className="rounded-lg border border-line">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          Item
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Stok Sistem
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Stok Fisik
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Selisih
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOpname.items.map((opItem: StockOpnameItem) => (
                        <TableRow key={opItem.id}>
                          <TableCell className="text-[13px] font-medium text-ink">
                            {opItem.item?.name || "-"}{" "}
                            <span className="text-ink-muted">
                              ({opItem.item?.unit})
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-ink-muted text-right">
                            {opItem.qty_system}
                          </TableCell>
                          <TableCell className="text-[13px] text-ink text-right font-medium">
                            {opItem.qty_fisik !== null ? opItem.qty_fisik : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {opItem.selisih !== null ? (
                              opItem.selisih === 0 ? (
                                <span className="text-[13px] text-status-good">
                                  ✓
                                </span>
                              ) : (
                                <span
                                  className={`text-[13px] font-medium ${opItem.selisih > 0 ? "text-status-good" : "text-status-expired"}`}
                                >
                                  {opItem.selisih > 0 ? "+" : ""}
                                  {opItem.selisih}
                                </span>
                              )
                            ) : (
                              <span className="text-[13px] text-ink-muted">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedOpname.items?.some(
                  (i) => i.selisih !== null && i.selisih !== 0
                ) && (
                  <div className="flex items-center gap-2 rounded-lg border border-status-lowstock/30 bg-status-lowstock/5 px-3 py-2">
                    <AlertTriangle
                      className="h-4 w-4 text-status-lowstock"
                      strokeWidth={1.75}
                    />
                    <span className="text-[12px] text-status-lowstock">
                      Terdapat selisih stok yang perlu disetujui
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {selectedOpname.status === "draft" && (
                  <Button
                    onClick={() => handleSubmitOpname(selectedOpname.id)}
                    disabled={submitting}
                    className="flex-1 bg-accent hover:bg-accent/90"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                    Submit untuk Approval
                  </Button>
                )}
                {canApprove &&
                  selectedOpname.status === "pending_approval" && (
                    <Button
                      onClick={() => handleApproveOpname(selectedOpname.id)}
                      disabled={submitting}
                      className="flex-1 bg-status-good hover:bg-status-good/90"
                    >
                      <CheckCircle
                        className="mr-1.5 h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      Setujui & Sinkronkan Stok
                    </Button>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus Stock Opname"
        description="Apakah Anda yakin ingin menghapus sesi stock opname ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteOpname}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
