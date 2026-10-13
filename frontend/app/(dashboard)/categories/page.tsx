"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Category } from "@/lib/types";
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
import { FolderOpen, Pencil, Trash2, Plus } from "lucide-react";

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";
  const canDelete = user?.role === "super_admin";

  const fetchCategories = async () => {
    try {
      const res = await api.get("/api/categories");
      setCategories(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setName("");
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, { name });
        toast.success("Kategori berhasil diperbarui");
      } else {
        await api.post("/api/categories", { name });
        toast.success("Kategori berhasil ditambahkan");
      }
      setDialogOpen(false);
      fetchCategories();
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
      await api.delete(`/api/categories/${deleteId}`);
      toast.success("Kategori berhasil dihapus");
      setDeleteId(null);
      fetchCategories();
    } catch {
      toast.error("Gagal menghapus kategori");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Kategori
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola kategori bahan baku ({categories.length})
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Tambah Kategori
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={2} />
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <FolderOpen className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada kategori
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {cat.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(cat)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(cat.id)}
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
              {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Nama Kategori</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama kategori"
              />
              {error && (
                <p className="text-[13px] text-status-expired">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
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
        title="Hapus Kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
