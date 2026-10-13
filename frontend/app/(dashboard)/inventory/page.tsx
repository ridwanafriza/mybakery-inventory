"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { BranchStock, Branch, Category, Item, StockPrediction } from "@/lib/types";
import { StatusBadge } from "@/components/inventory/status-badge";
import { EstimatedDaysLeft } from "@/components/inventory/estimated-days-left";
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
import { toast } from "sonner";
import { Package, ArrowDownToLine, ArrowUpFromLine, Search, Layers, X, ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";

export default function InventoryPage() {
  const { user } = useAuth();
  const { selectedBranchId, branches: contextBranches } = useBranch();
  const [stocks, setStocks] = useState<BranchStock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"in" | "out">("in");
  const [form, setForm] = useState({
    item_id: "all",
    branch_id: "all",
    quantity: "",
    note: "",
    expiry_date: "",
    storage_location: "pantry",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bulk movement state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<"in" | "out">("in");
  const [bulkBranchId, setBulkBranchId] = useState("all");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkItems, setBulkItems] = useState<{ item_id: string; quantity: string }[]>([{ item_id: "", quantity: "" }]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Barcode scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [stocksRes, branchesRes, catsRes, itemsRes, predRes] = await Promise.all([
        api.get("/api/stock-overview"),
        api.get("/api/branches"),
        api.get("/api/categories"),
        api.get("/api/items"),
        api.get("/api/stock-predictions"),
      ]);
      setStocks(stocksRes.data.data);
      setBranches(branchesRes.data.data);
      setCategories(catsRes.data.data);
      setItems(itemsRes.data.data);
      setPredictions(predRes.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const predictionMap = useMemo(() => {
    const map = new Map<string, StockPrediction>();
    predictions.forEach((p) => map.set(`${p.branch_id}:${p.item_id}`, p));
    return map;
  }, [predictions]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      setFilterBranch(String(selectedBranchId));
    } else if (user?.role === "super_admin") {
      setFilterBranch("all");
    }
  }, [selectedBranchId, user]);

  const filteredStocks = useMemo(() => {
    let result = stocks;
    if (filterBranch !== "all") result = result.filter((s) => String(s.branch_id) === filterBranch);
    if (filterCategory !== "all") result = result.filter((s) => String(s.item?.category_id) === filterCategory);
    if (filterStatus !== "all") result = result.filter((s) => s.status === filterStatus);
    if (searchQuery.trim()) {
      const fuse = new Fuse(result, { keys: ["item.name", "branch.name"], threshold: 0.4 });
      result = fuse.search(searchQuery).map((r) => r.item);
    }
    return result;
  }, [stocks, filterBranch, filterCategory, filterStatus, searchQuery]);

  const openStockIn = () => {
    setDialogType("in");
    setForm({ item_id: "all", branch_id: "all", quantity: "", note: "", expiry_date: "", storage_location: "pantry" });
    setError("");
    setDialogOpen(true);
  };

  const openStockOut = () => {
    setDialogType("out");
    setForm({ item_id: "all", branch_id: "all", quantity: "", note: "", expiry_date: "", storage_location: "pantry" });
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (form.item_id === "all" || form.branch_id === "all" || !form.quantity || Number(form.quantity) <= 0) {
      setError("Pilih item, cabang, dan masukkan jumlah yang valid");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/stock-movements", {
        item_id: Number(form.item_id),
        branch_id: Number(form.branch_id),
        type: dialogType,
        quantity: Number(form.quantity),
        note: form.note || null,
        expiry_date: form.expiry_date || null,
        storage_location: form.storage_location,
      });
      setDialogOpen(false);
      fetchData();
      toast.success(dialogType === "in" ? "Stok masuk berhasil dicatat" : "Stok keluar berhasil dicatat");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, Array<{ message: string }>> } } })?.response?.data;
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0]?.message : data?.message;
      setError(firstError || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Inventory Overview
          </h1>
          <p className="text-[13px] text-ink-muted">
            {filteredStocks.length} items, total stock: {filteredStocks.reduce((sum, s) => sum + s.quantity, 0).toFixed(0)} unit
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScannerOpen(true)} variant="outline" className="border-accent text-accent hover:bg-accent/5">
            <ScanLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Scan Barcode
          </Button>
          <Button onClick={openStockIn} className="bg-status-good hover:bg-status-good/90 text-white">
            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Stok Masuk
          </Button>
          <Button onClick={openStockOut} variant="outline" className="border-status-expired text-status-expired hover:bg-status-expired/5">
            <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Stok Keluar
          </Button>
          <Button onClick={() => { setBulkType("in"); setBulkBranchId("all"); setBulkNote(""); setBulkItems([{ item_id: "", quantity: "" }]); setBulkOpen(true); }} variant="outline" className="border-accent text-accent hover:bg-accent/5">
            <Layers className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Bulk Input
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search Inventory"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>

        {branches.length > 1 && (
          <Select value={filterBranch} onValueChange={(v) => setFilterBranch(v ?? "all")}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
              <SelectValue placeholder="Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="good">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={9} />
        ) : filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Package className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada data stok
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted w-[50px]">Gambar</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Name</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Cabang</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Stock</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Satuan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Lokasi</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Kadaluarsa</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Estimasi Habis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStocks.map((stock) => {
                const pred = predictionMap.get(`${stock.branch_id}:${stock.item_id}`);
                return (
                <TableRow key={stock.id}>
                  <TableCell>
                    {stock.item?.image ? (
                      <img src={stock.item.image} alt={stock.item?.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <Package className="h-4 w-4 text-ink-muted/40" strokeWidth={1.75} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {stock.item?.name}
                    <span className="block text-[11px] text-ink-muted sm:hidden">{stock.item?.category?.name}</span>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden sm:table-cell">{stock.item?.category?.name}</TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden md:table-cell">{stock.branch?.name}</TableCell>
                  <TableCell className="text-right text-[13px] font-medium text-ink">
                    {stock.quantity}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">{stock.item?.unit}</TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">{stock.storage_location}</TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">
                    {stock.expiry_date || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={stock.status} />
                  </TableCell>
                  <TableCell>
                    <EstimatedDaysLeft days={pred?.estimated_days_left ?? null} />
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Stock In/Out Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              {dialogType === "in" ? "Stok Masuk" : "Stok Keluar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Cabang</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm({ ...form, branch_id: v ?? "all" })}
              >
                <SelectTrigger>
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
              <Label className="text-[13px]">Item</Label>
              <Select
                value={form.item_id}
                onValueChange={(v) => setForm({ ...form, item_id: v ?? "all" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih item" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => {
                    const catItems = items.filter((i) => i.category_id === cat.id);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="px-2 py-1 text-[11px] font-semibold text-ink-muted">{cat.name}</div>
                        {catItems.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.unit})
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-[13px]">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              {dialogType === "in" && (
                <div className="space-y-2">
                  <Label className="text-[13px]">Lokasi</Label>
                  <Select
                    value={form.storage_location}
                    onValueChange={(v) => setForm({ ...form, storage_location: v ?? "pantry" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pantry">Pantry</SelectItem>
                      <SelectItem value="freezer">Freezer</SelectItem>
                      <SelectItem value="cold_storage">Cold Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {dialogType === "in" && (
              <div className="space-y-2">
                <Label htmlFor="expiry_date" className="text-[13px]">Tanggal Kadaluarsa (opsional)</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note" className="text-[13px]">Catatan (opsional)</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Contoh: Restok mingguan"
              />
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
              className={dialogType === "in"
                ? "bg-status-good hover:bg-status-good/90 text-white"
                : "bg-status-expired hover:bg-status-expired/90 text-white"
              }
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : dialogType === "in" ? "Catat Stok Masuk" : "Catat Stok Keluar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Movement Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Bulk Stock {bulkType === "in" ? "Masuk" : "Keluar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px]">Tipe</Label>
                <Select value={bulkType} onValueChange={(v) => setBulkType(v as "in" | "out")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stok Masuk</SelectItem>
                    <SelectItem value="out">Stok Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Cabang</Label>
                <Select value={bulkBranchId} onValueChange={(v) => setBulkBranchId(v ?? "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">Daftar Item</Label>
              <div className="max-h-[250px] space-y-2 overflow-y-auto">
                {bulkItems.map((bi, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={bi.item_id} onValueChange={(v) => {
                      const next = [...bulkItems];
                      next[idx] = { ...next[idx], item_id: v ?? "" };
                      setBulkItems(next);
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Pilih item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((it) => (
                          <SelectItem key={it.id} value={String(it.id)}>{it.name} ({it.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Qty"
                      className="w-[80px]"
                      value={bi.quantity}
                      onChange={(e) => {
                        const next = [...bulkItems];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        setBulkItems(next);
                      }}
                    />
                    {bulkItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== idx))}>
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => setBulkItems([...bulkItems, { item_id: "", quantity: "" }])}>
                + Tambah Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">Catatan (opsional)</Label>
              <Input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Contoh: Restok mingguan" />
            </div>

            {error && <p className="text-[13px] text-status-expired">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Batal</Button>
            <Button
              onClick={async () => {
                if (!bulkBranchId || bulkBranchId === "all") {
                  setError("Pilih cabang terlebih dahulu");
                  return;
                }
                const validItems = bulkItems.filter(bi => bi.item_id && bi.quantity);
                if (validItems.length === 0) {
                  setError("Minimal pilih 1 item dengan jumlah");
                  return;
                }
                setBulkSubmitting(true);
                setError("");
                try {
                  await api.post("/api/stock-movements/bulk", {
                    branch_id: Number(bulkBranchId),
                    type: bulkType,
                    note: bulkNote || null,
                    items: validItems.map(bi => ({ item_id: Number(bi.item_id), quantity: Number(bi.quantity) })),
                  });
                  toast.success(`Bulk ${bulkType === "in" ? "stok masuk" : "stok keluar"} berhasil dicatat`);
                  setBulkOpen(false);
                  fetchData();
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  setError(msg || "Terjadi kesalahan");
                } finally {
                  setBulkSubmitting(false);
                }
              }}
              disabled={bulkSubmitting}
              className="bg-accent hover:bg-accent/90"
            >
              {bulkSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Simpan Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSelectItem={(item) => {
          setForm((prev) => ({ ...prev, item_id: String(item.id) }));
          setDialogType("in");
          setDialogOpen(true);
        }}
      />
    </div>
  );
}
