"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { Item, Category, Supplier } from "@/lib/types";
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
import { Package, Pencil, Trash2, Plus, ImagePlus, X, Search, QrCode } from "lucide-react";
import { BarcodeDisplay } from "@/components/items/barcode-display";

export default function ItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    category_id: "all",
    unit: "",
    threshold: "10",
    is_perishable: false,
    default_supplier_id: "none",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [qrItem, setQrItem] = useState<Item | null>(null);

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";
  const canDelete = user?.role === "super_admin";

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes, supRes] = await Promise.all([
        api.get("/api/items"),
        api.get("/api/categories"),
        api.get("/api/suppliers"),
      ]);
      setItems(itemsRes.data.data);
      setCategories(catsRes.data.data);
      setSuppliers(supRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoryFiltered = filterCategory === "all"
    ? items
    : items.filter((i) => String(i.category_id) === filterCategory);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return categoryFiltered;
    const fuse = new Fuse(categoryFiltered, { keys: ["name"], threshold: 0.4 });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [categoryFiltered, searchQuery]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: "", category_id: "all", unit: "", threshold: "10", is_perishable: false, default_supplier_id: "none" });
    setImagePreview(null);
    setImageFile(null);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category_id: String(item.category_id),
      unit: item.unit,
      threshold: String(item.threshold),
      is_perishable: item.is_perishable,
      default_supplier_id: item.default_supplier_id ? String(item.default_supplier_id) : "none",
    });
    setImagePreview(item.image || null);
    setImageFile(null);
    setError("");
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran gambar maksimal 2MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.category_id === "all" || !form.unit.trim()) {
      setError("Semua field wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category_id", form.category_id);
      formData.append("unit", form.unit);
      formData.append("threshold", form.threshold);
      formData.append("is_perishable", form.is_perishable ? "1" : "0");
      if (form.default_supplier_id !== "none") {
        formData.append("default_supplier_id", form.default_supplier_id);
      } else {
        formData.append("default_supplier_id", "");
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editingItem) {
        formData.append("_method", "PUT");
        await api.post(`/api/items/${editingItem.id}`, formData, config);
        toast.success("Item berhasil diperbarui");
      } else {
        await api.post("/api/items", formData, config);
        toast.success("Item berhasil ditambahkan");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/items/${deleteId}`);
      toast.success("Item berhasil dihapus");
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Gagal menghapus item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Master Item
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola daftar bahan baku ({filteredItems.length})
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Tambah Item
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-[13px]">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Package className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada item
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted w-[50px]">Gambar</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Name</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">Barcode</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Satuan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Threshold</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden lg:table-cell">Perishable</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <Package className="h-4 w-4 text-ink-muted/40" strokeWidth={1.75} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {item.name}
                    <span className="block text-[11px] text-ink-muted sm:hidden">{item.category?.name}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.barcode ? (
                      <button
                        onClick={() => setQrItem(item)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] font-mono text-ink-muted hover:bg-secondary/80 transition-colors"
                      >
                        <QrCode className="h-3 w-3" strokeWidth={1.75} />
                        {item.barcode}
                      </button>
                    ) : (
                      <span className="text-[11px] text-ink-muted/40">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden sm:table-cell">{item.category?.name}</TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden md:table-cell">{item.unit}</TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden lg:table-cell">{item.threshold}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {item.is_perishable ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-low">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-low" />
                        Ya
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted/30" />
                        Tidak
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-status-expired" strokeWidth={1.75} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              {editingItem ? "Edit Item" : "Tambah Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image upload */}
            <div className="space-y-2">
              <Label className="text-[13px]">Gambar Item</Label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={() => { setImagePreview(null); setImageFile(null); }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-status-expired text-white"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-line hover:border-accent transition-colors"
                  >
                    <ImagePlus className="h-6 w-6 text-ink-muted/40" strokeWidth={1.75} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-[11px] text-ink-muted">JPG, PNG, atau WebP. Maks 2MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Nama Item</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masukkan nama item"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Kategori</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v ?? "all" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-[13px]">Satuan</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="kg / liter / pcs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold" className="text-[13px]">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_perishable"
                checked={form.is_perishable}
                onChange={(e) => setForm({ ...form, is_perishable: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_perishable" className="text-[13px]">Perishable (mudah rusak/kadaluarsa)</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Supplier Default</Label>
              <Select
                value={form.default_supplier_id}
                onValueChange={(v) => setForm({ ...form, default_supplier_id: v ?? "none" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih supplier (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa supplier —</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={String(sup.id)}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-ink-muted">
                Dipakai auto-isi supplier di Saran Pemesanan &amp; hitung reorder point (lead time).
              </p>
            </div>
            {error && (
              <p className="text-[13px] text-status-expired">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-accent hover:bg-accent/90">
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

      {/* QR Code Dialog */}
      <Dialog open={qrItem !== null} onOpenChange={(open) => { if (!open) setQrItem(null); }}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              QR Code — {qrItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {qrItem?.barcode && (
              <BarcodeDisplay barcode={qrItem.barcode} itemName={qrItem.name} size="lg" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus Item"
        description="Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
