"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { Supplier } from "@/lib/types";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Truck, Pencil, Trash2, Plus, Search } from "lucide-react";

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    lead_time_days: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";
  const canDelete = user?.role === "super_admin";

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/api/suppliers");
      setSuppliers(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const fuse = new Fuse(suppliers, { keys: ["name", "contact_person", "email"], threshold: 0.4 });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [suppliers, searchQuery]);

  const openCreate = () => {
    setEditingSupplier(null);
    setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", lead_time_days: "0" });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      lead_time_days: String(supplier.lead_time_days ?? 0),
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Nama supplier wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...formData,
        lead_time_days: Number(formData.lead_time_days) || 0,
      };
      if (editingSupplier) {
        await api.put(`/api/suppliers/${editingSupplier.id}`, payload);
        toast.success("Supplier berhasil diperbarui");
      } else {
        await api.post("/api/suppliers", payload);
        toast.success("Supplier berhasil ditambahkan");
      }
      setDialogOpen(false);
      fetchSuppliers();
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
      await api.delete(`/api/suppliers/${deleteId}`);
      toast.success("Supplier berhasil dihapus");
      setDeleteId(null);
      fetchSuppliers();
    } catch {
      toast.error("Gagal menghapus supplier");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Supplier
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola data supplier bahan baku ({filteredSuppliers.length})
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Tambah Supplier
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Truck className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada supplier
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Kontak</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Telepon</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Email</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted hidden md:table-cell">Lead Time</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {supplier.name}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {supplier.contact_person || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {supplier.phone || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {supplier.email || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted hidden md:table-cell">
                    {supplier.lead_time_days ?? 0} hari
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(supplier)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(supplier.id)}
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
              {editingSupplier ? "Edit Supplier" : "Tambah Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Nama Supplier *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama supplier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person" className="text-[13px]">Kontak Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nama kontak person"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[13px]">Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812-xxxx-xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@supplier.co.id"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-[13px]">Alamat</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat supplier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time_days" className="text-[13px]">Lead Time (hari)</Label>
              <Input
                id="lead_time_days"
                type="number"
                min="0"
                max="365"
                value={formData.lead_time_days}
                onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                placeholder="Estimasi hari pengiriman setelah PO"
              />
              <p className="text-[11px] text-ink-muted">
                Estimasi hari dari supplier untuk mengirim bahan — dipakai hitung reorder point.
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

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus Supplier"
        description="Apakah Anda yakin ingin menghapus supplier ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
