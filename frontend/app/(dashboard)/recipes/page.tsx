"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Recipe, RecipeItem, Item } from "@/lib/types";
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
import { ChefHat, Pencil, Trash2, Plus, X } from "lucide-react";

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    items: [] as { item_id: number; quantity: number }[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user?.role === "super_admin" || user?.role === "branch_admin";
  const canDelete = user?.role === "super_admin";

  const fetchRecipes = async () => {
    try {
      const res = await api.get("/api/recipes");
      setRecipes(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    const res = await api.get("/api/items");
    setItems(res.data.data);
  };

  useEffect(() => {
    fetchRecipes();
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditingRecipe(null);
    setFormData({ name: "", description: "", items: [{ item_id: 0, quantity: 1 }] });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || "",
      items: recipe.items.map((ri) => ({ item_id: ri.item_id, quantity: ri.quantity })),
    });
    setError("");
    setDialogOpen(true);
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { item_id: 0, quantity: 1 }] });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: "item_id" | "quantity", value: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Nama resep wajib diisi");
      return;
    }
    if (formData.items.length === 0 || formData.items.every((i) => i.item_id === 0)) {
      setError("Minimal tambahkan satu bahan");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...formData,
        items: formData.items.filter((i) => i.item_id > 0),
      };
      if (editingRecipe) {
        await api.put(`/api/recipes/${editingRecipe.id}`, payload);
        toast.success("Resep berhasil diperbarui");
      } else {
        await api.post("/api/recipes", payload);
        toast.success("Resep berhasil ditambahkan");
      }
      setDialogOpen(false);
      fetchRecipes();
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
      await api.delete(`/api/recipes/${deleteId}`);
      toast.success("Resep berhasil dihapus");
      setDeleteId(null);
      fetchRecipes();
    } catch {
      toast.error("Gagal menghapus resep");
    } finally {
      setDeleting(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Resep / BOM
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola resep dan bahan baku produk ({recipes.length})
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Tambah Resep
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <ChefHat className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada resep
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama Resep</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Deskripsi</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Bahan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {recipe.name}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted max-w-[200px] truncate">
                    {recipe.description || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted text-right">
                    {recipe.items.length} bahan
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(recipe)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(recipe.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              {editingRecipe ? "Edit Resep" : "Tambah Resep"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Nama Resep *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Roti Tawar Gandum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[13px]">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat resep"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px]">Daftar Bahan *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" strokeWidth={1.75} />
                  Tambah Bahan
                </Button>
              </div>
              <div className="space-y-2">
                {formData.items.map((ri, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select value={ri.item_id ? String(ri.item_id) : ""} onValueChange={(val) => updateItem(index, "item_id", Number(val))}>
                      <SelectTrigger className="flex-1 h-9 text-[13px]">
                        <SelectValue placeholder="Pilih bahan..." />
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
                      value={ri.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                      className="w-24"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                    />
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
        title="Hapus Resep"
        description="Apakah Anda yakin ingin menghapus resep ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        variant="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
