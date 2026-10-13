"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Recipe, Branch } from "@/lib/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Calculator, CheckCircle2, XCircle, ShoppingCart } from "lucide-react";

interface Ingredient {
  item_id: number;
  item_name: string;
  barcode: string | null;
  unit: string;
  qty_per_batch: number;
  qty_needed: number;
  stock_available: number;
  sufficient: boolean;
  deficit: number;
  cost_per_unit: number;
  subtotal: number;
}

interface CalcResult {
  recipe: { id: number; name: string; description: string | null };
  yield: number;
  branch_id: number | null;
  ingredients: Ingredient[];
  total_cost: number;
  cost_per_unit: number;
  summary: {
    total_ingredients: number;
    sufficient: number;
    insufficient: number;
    all_sufficient: boolean;
  };
}

export default function ProductionPlanPage() {
  const { user } = useAuth();
  const { selectedBranchId, branches: contextBranches } = useBranch();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRecipe, setSelectedRecipe] = useState<string>("");
  const [yieldQty, setYieldQty] = useState<string>("10");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState("");

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    Promise.all([api.get("/api/recipes"), api.get("/api/branches")])
      .then(([recipesRes, branchesRes]) => {
        setRecipes(recipesRes.data.data);
        setBranches(branchesRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCalculate = async () => {
    if (!selectedRecipe || !yieldQty) return;
    setCalculating(true);
    setError("");
    setResult(null);

    try {
      const params: Record<string, string | number> = {
        yield: parseInt(yieldQty),
      };
      if (branchFilter !== "all") params.branch_id = parseInt(branchFilter);

      const res = await api.post(
        `/api/recipes/${selectedRecipe}/calculate`,
        null,
        { params },
      );
      setResult(res.data);
    } catch {
      setError("Gagal menghitung kebutuhan produksi");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Rencana Produksi
          </h1>
          <p className="text-[13px] text-ink-muted">
            Hitung kebutuhan bahan untuk produksi
          </p>
        </div>
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Rencana Produksi</h1>
        <p className="text-[13px] text-ink-muted">
          Hitung kebutuhan bahan baku berdasarkan resep dan jumlah produksi
        </p>
      </div>

      {/* Calculator Form */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-accent" strokeWidth={1.75} />
          <h2 className="text-[15px] font-semibold text-ink">
            Kalkulator Produksi
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[13px]">Resep</Label>
            <Select
              value={selectedRecipe}
              onValueChange={(v) => setSelectedRecipe(v ?? "")}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label className="text-[13px]">Jumlah Porsi (Yield)</Label>
            <Input
              type="number"
              min="1"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px]">Cek Stok Cabang</Label>
            <Select
              value={branchFilter}
              onValueChange={(v) => setBranchFilter(v ?? "all")}
            >
              <SelectTrigger>
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
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleCalculate}
            disabled={!selectedRecipe || !yieldQty || calculating}
            className="bg-accent hover:bg-accent/90"
          >
            {calculating ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Menghitung...
              </span>
            ) : (
              <>
                <Calculator className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                Hitung
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-status-expired">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Resep
              </p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {result.recipe.name}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Yield
              </p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {result.yield} porsi
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Total Biaya
              </p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {formatRupiah(result.total_cost)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Biaya/Porsi
              </p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {formatRupiah(result.cost_per_unit)}
              </p>
            </div>
          </div>

          {/* Stock Status Banner */}
          <div
            className={`rounded-xl p-4 flex items-center gap-3 ${
              result.summary.all_sufficient
                ? "bg-status-good/10 border border-status-good/20"
                : "bg-status-expired/10 border border-status-expired/20"
            }`}
          >
            {result.summary.all_sufficient ? (
              <CheckCircle2
                className="h-5 w-5 text-status-good shrink-0"
                strokeWidth={1.75}
              />
            ) : (
              <XCircle
                className="h-5 w-5 text-status-expired shrink-0"
                strokeWidth={1.75}
              />
            )}
            <div>
              <p
                className={`text-[13px] font-semibold ${result.summary.all_sufficient ? "text-status-good" : "text-status-expired"}`}
              >
                {result.summary.all_sufficient
                  ? "Semua bahan mencukupi"
                  : `${result.summary.insufficient} bahan tidak mencukupi`}
              </p>
              <p className="text-[11px] text-ink-muted">
                {result.summary.sufficient} dari{" "}
                {result.summary.total_ingredients} bahan tersedia cukup
              </p>
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Bahan
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right hidden sm:table-cell">
                    Qty/Porsi
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                    Total Dibutuhkan
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">
                    Stok Tersedia
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right hidden md:table-cell">
                    Biaya
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.ingredients.map((ing) => (
                  <TableRow key={ing.item_id}>
                    <TableCell>
                      <div>
                        <p className="text-[13px] font-medium text-ink">
                          {ing.item_name}
                        </p>
                        <p className="text-[10px] text-ink-muted">{ing.unit}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[13px] text-ink-muted hidden sm:table-cell">
                      {ing.qty_per_batch}
                    </TableCell>
                    <TableCell className="text-right text-[13px] font-semibold text-ink">
                      {ing.qty_needed} {ing.unit}
                    </TableCell>
                    <TableCell className="text-right text-[13px] text-ink">
                      {ing.stock_available} {ing.unit}
                    </TableCell>
                    <TableCell className="text-right text-[13px] text-ink-muted hidden md:table-cell">
                      {formatRupiah(ing.subtotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      {ing.sufficient ? (
                        <Badge className="bg-status-good/10 text-status-good border-status-good/20 text-[11px]">
                          Cukup
                        </Badge>
                      ) : (
                        <Badge className="bg-status-expired/10 text-status-expired border-status-expired/20 text-[11px]">
                          Kurang {ing.deficit} {ing.unit}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
