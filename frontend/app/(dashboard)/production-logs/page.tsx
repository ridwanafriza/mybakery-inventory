"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { ProductionLog, Recipe, Branch, BranchStock } from "@/lib/types";
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
import Fuse from "fuse.js";
import { Factory, Plus, Eye } from "lucide-react";
import { toast } from "sonner";

export default function ProductionLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([]);

  // Search & filter
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [recipeFilter, setRecipeFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    branch_id: "",
    recipe_id: "",
    quantity: "1",
    produced_at: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ProductionLog | null>(null);

  const isSuperAdmin = user?.role === "super_admin";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logRes, recipeRes, branchRes] = await Promise.all([
        api.get("/api/production-logs"),
        api.get("/api/recipes"),
        api.get("/api/branches"),
      ]);
      setLogs(logRes.data.data);
      setRecipes(recipeRes.data.data);
      setBranches(branchRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch stok cabang terpilih untuk preview kebutuhan bahan
  const previewBranchId = isSuperAdmin
    ? createForm.branch_id
    : String(user?.branch_id ?? "");

  useEffect(() => {
    if (!createOpen || !previewBranchId) return;
    api
      .get(`/api/stock-overview?branch_id=${previewBranchId}`)
      .then((res) => setBranchStocks(res.data.data))
      .catch(() => setBranchStocks([]));
  }, [createOpen, previewBranchId]);

  const selectedRecipe = recipes.find(
    (r) => r.id === Number(createForm.recipe_id)
  );

  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    branchStocks.forEach((bs) => map.set(bs.item_id, Number(bs.quantity)));
    return map;
  }, [branchStocks]);

  // Preview kebutuhan bahan: recipe_items.qty × quantity — angka dari FE hanya preview,
  // backend tetap menghitung ulang & memvalidasi saat submit.
  const previewItems = useMemo(() => {
    if (!selectedRecipe) return [];
    const qty = Math.max(1, parseInt(createForm.quantity) || 1);
    return selectedRecipe.items.map((ri) => {
      const needed = Math.round(ri.quantity * qty * 100) / 100;
      const available = stockMap.get(ri.item_id) ?? 0;
      return {
        item_id: ri.item_id,
        name: ri.item?.name ?? "-",
        unit: ri.item?.unit ?? "",
        per_batch: ri.quantity,
        needed,
        available,
        sufficient: available >= needed,
      };
    });
  }, [selectedRecipe, createForm.quantity, stockMap]);

  const allSufficient =
    previewItems.length > 0 && previewItems.every((p) => p.sufficient);

  const fuse = useMemo(
    () =>
      new Fuse(logs, {
        keys: [
          "recipe.name",
          "branch.name",
          "user.name",
          "notes",
        ],
        threshold: 0.4,
      }),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    let result = search.trim()
      ? fuse.search(search).map((r) => r.item)
      : logs;
    if (branchFilter !== "all") {
      result = result.filter(
        (l) => String(l.branch_id) === branchFilter
      );
    }
    if (recipeFilter !== "all") {
      result = result.filter(
        (l) => String(l.recipe_id) === recipeFilter
      );
    }
    return result;
  }, [logs, search, fuse, branchFilter, recipeFilter]);

  const handleCreate = async () => {
    setError("");
    if (!createForm.recipe_id) {
      setError("Pilih resep yang akan diproduksi");
      return;
    }
    if (!createForm.quantity || parseInt(createForm.quantity) < 1) {
      setError("Jumlah produksi minimal 1 batch");
      return;
    }
    if (!createForm.produced_at) {
      setError("Tanggal produksi wajib diisi");
      return;
    }
    const branchId = isSuperAdmin
      ? createForm.branch_id
      : String(user?.branch_id ?? "");
    if (!branchId) {
      setError("Pilih cabang");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/production-logs", {
        recipe_id: Number(createForm.recipe_id),
        quantity: parseInt(createForm.quantity),
        branch_id: Number(branchId),
        produced_at: createForm.produced_at,
        notes: createForm.notes || null,
      });
      toast.success("Produksi berhasil dicatat, stok bahan telah diperbarui");
      setCreateOpen(false);
      setCreateForm({
        branch_id: "",
        recipe_id: "",
        quantity: "1",
        produced_at: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setBranchStocks([]);
      fetchData();
    } catch (err: unknown) {
      const data = (
        err as {
          response?: { data?: { message?: string; missing?: unknown } };
        }
      )?.response?.data;
      const msg = data?.message || "Gagal mencatat produksi";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const viewDetail = async (id: number) => {
    const local = logs.find((l) => l.id === id);
    if (local?.items?.length) {
      setDetail(local);
      setDetailOpen(true);
      return;
    }
    try {
      const res = await api.get(`/api/production-logs?page=1`);
      const found = (res.data.data as ProductionLog[]).find(
        (l) => l.id === id
      );
      setDetail(found ?? local ?? null);
      setDetailOpen(true);
    } catch {
      toast.error("Gagal memuat detail");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Catat Produksi</h1>
          <p className="text-[13px] text-ink-muted">
            Riwayat produksi — stok bahan terpotong otomatis dari resep
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Catat Produksi
        </button>
      </div>

      {/* Search & filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari resep, cabang, staf..."
          className="h-9 w-full max-w-xs text-[13px]"
        />
        {isSuperAdmin && (
          <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-44 text-[13px]">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={recipeFilter} onValueChange={(v) => setRecipeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-48 text-[13px]">
            <SelectValue placeholder="Semua Resep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Resep</SelectItem>
            {recipes.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Factory className="h-6 w-6 text-accent" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] font-medium text-ink">
              Belum ada catatan produksi
            </p>
            <p className="text-[11px] text-ink-muted">
              Catat produksi untuk memotong stok bahan sesuai resep
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Tanggal
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Resep
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Cabang
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                  Batch
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Dicatat Oleh
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-[13px] text-ink-muted">
                    {log.produced_at}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {log.recipe?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {log.branch?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-right">
                    {log.quantity}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {log.user?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => viewDetail(log.id)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-secondary"
                      title="Detail"
                    >
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Catat Produksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label className="text-[13px]">Cabang *</Label>
                <Select
                  value={createForm.branch_id}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, branch_id: val ?? "" })
                  }
                >
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
            )}
            <div className="space-y-2">
              <Label className="text-[13px]">Resep *</Label>
              <Select
                value={createForm.recipe_id}
                onValueChange={(val) =>
                  setCreateForm({ ...createForm, recipe_id: val ?? "" })
                }
              >
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Pilih resep" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px]">Jumlah Batch *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.quantity}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, quantity: e.target.value })
                  }
                  placeholder="1"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Tanggal Produksi *</Label>
                <Input
                  type="date"
                  value={createForm.produced_at}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, produced_at: e.target.value })
                  }
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Catatan</Label>
              <Input
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="Catatan produksi (opsional)"
                className="h-9 text-[13px]"
              />
            </div>

            {/* Preview kebutuhan bahan */}
            {selectedRecipe && previewItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[13px]">
                  Preview Kebutuhan Bahan{" "}
                  <span className="text-ink-muted">
                    ({createForm.quantity || 1} batch)
                  </span>
                </Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-line">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          Bahan
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Dibutuhkan
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                          Stok
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewItems.map((p) => (
                        <TableRow key={p.item_id}>
                          <TableCell className="text-[13px]">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-[13px] text-right">
                            {p.needed} {p.unit}
                          </TableCell>
                          <TableCell
                            className={`text-[13px] text-right font-medium ${
                              p.sufficient
                                ? "text-status-good"
                                : "text-status-expired"
                            }`}
                          >
                            {p.available} {p.unit}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {!allSufficient && (
                  <p className="text-[12px] text-status-expired">
                    Stok beberapa bahan kurang — produksi akan ditolak sampai
                    stok mencukupi.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-status-expired/10 px-3 py-2 text-[12px] text-status-expired">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-accent hover:bg-accent/90"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : (
                "Catat Produksi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Detail Produksi
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <p className="text-ink-muted">Resep</p>
                  <p className="font-medium">{detail.recipe?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Cabang</p>
                  <p className="font-medium">{detail.branch?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Jumlah Batch</p>
                  <p className="font-medium">{detail.quantity}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Tanggal Produksi</p>
                  <p className="font-medium">{detail.produced_at}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Dicatat Oleh</p>
                  <p className="font-medium">{detail.user?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Dicatat Pada</p>
                  <p className="font-medium">
                    {detail.created_at?.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
              </div>
              {detail.notes && (
                <div className="text-[13px]">
                  <p className="text-ink-muted">Catatan</p>
                  <p>{detail.notes}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-[13px] text-ink-muted">
                  Bahan Terpakai
                </p>
                <div className="rounded-lg border border-line">
                  {(detail.items ?? []).map((li) => (
                    <div
                      key={li.id}
                      className="flex items-center justify-between border-b border-line px-3 py-2 last:border-0"
                    >
                      <span className="text-[13px]">{li.item?.name}</span>
                      <span className="text-[13px] font-medium">
                        {li.quantity_used} {li.item?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
