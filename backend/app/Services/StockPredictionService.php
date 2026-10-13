<?php

namespace App\Services;

use App\Models\BranchStock;
use App\Models\StockMovement;
use Illuminate\Support\Collection;

/**
 * Prediksi stok per item per cabang (Fase 15).
 *
 * Aturan bisnis (CONTEXT.md §10):
 * - avg_daily_usage hanya dari stock movement out reason `production`
 *   (expired/damaged/opname/transfer/return dikecualikan).
 * - estimated_days_left = floor(quantity ÷ avg_daily_usage); null = "Data belum cukup".
 * - reorder_point = avg_daily_usage × (lead_time_days + safety_days).
 * - needs_reorder = quantity ≤ reorder_point (dan avg ada).
 * - Respons TIDAK memuat cost_price (SECURITY.md §4b).
 */
class StockPredictionService
{
    public function windowDays(): int
    {
        return max(1, (int) config('inventory.prediction_window_days', 30));
    }

    public function safetyDays(): int
    {
        return max(0, (int) config('inventory.safety_days', 3));
    }

    public function defaultLeadTimeDays(): int
    {
        return max(0, (int) config('inventory.default_lead_time_days', 0));
    }

    /**
     * Rata-rata pemakaian harian (out + reason production) dalam window hari terakhir.
     * Dihitung per (branch_id, item_id). Bagi dengan N hari (window), bukan jumlah hari aktif.
     *
     * @return Collection<int, array{branch_id:int, item_id:int, total_usage:float, avg_daily_usage:float}>
     */
    public function usageAverages(?int $branchId = null): Collection
    {
        $since = now()->subDays($this->windowDays());

        $rows = StockMovement::query()
            ->selectRaw('branch_id, item_id, SUM(quantity) as total_usage')
            ->where('type', 'out')
            ->where('reason', 'production')
            ->where('created_at', '>=', $since)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->groupBy('branch_id', 'item_id')
            ->get();

        $window = $this->windowDays();

        return $rows->map(fn ($row) => [
            'branch_id' => (int) $row->branch_id,
            'item_id' => (int) $row->item_id,
            'total_usage' => (float) $row->total_usage,
            'avg_daily_usage' => (float) $row->total_usage / $window,
        ]);
    }

    /**
     * Hitung field prediksi untuk satu branch stock.
     *
     * @param array{avg_daily_usage: float}|null $usage null = tidak ada data pemakaian
     */
    public function predictForStock(BranchStock $stock, ?array $usage): array
    {
        $avg = $usage !== null ? (float) $usage['avg_daily_usage'] : 0.0;
        $hasUsage = $usage !== null && $avg > 0;
        $quantity = (float) $stock->quantity;

        $leadTime = $stock->item?->defaultSupplier?->lead_time_days
            ?? $this->defaultLeadTimeDays();

        $reorderPoint = $hasUsage
            ? round($avg * ((int) $leadTime + $this->safetyDays()), 2)
            : null;

        $estimatedDaysLeft = $hasUsage
            ? (int) floor($quantity / $avg)
            : null;

        $needsReorder = $reorderPoint !== null && $quantity <= $reorderPoint;

        // Qty saran: isi ulang sampai 2× reorder point (minimal 1 unit di atas reorder point)
        $suggestedQuantity = null;
        if ($needsReorder && $reorderPoint !== null) {
            $target = $reorderPoint * 2;
            $suggestedQuantity = (int) ceil(max($target - $quantity, $reorderPoint - $quantity, 1));
        }

        return [
            'item_id' => $stock->item_id,
            'item_name' => $stock->item?->name ?? '',
            'unit' => $stock->item?->unit ?? '',
            'branch_id' => $stock->branch_id,
            'branch_name' => $stock->branch?->name ?? '',
            'quantity' => $quantity,
            'avg_daily_usage' => $hasUsage ? round($avg, 4) : null,
            'estimated_days_left' => $estimatedDaysLeft,
            'lead_time_days' => (int) $leadTime,
            'safety_days' => $this->safetyDays(),
            'reorder_point' => $reorderPoint,
            'needs_reorder' => $needsReorder,
            'suggested_quantity' => $suggestedQuantity,
            'default_supplier_id' => $stock->item?->default_supplier_id,
            'default_supplier_name' => $stock->item?->defaultSupplier?->name,
        ];
    }

    /**
     * Prediksi untuk semua branch stock sesuai scope user.
     * Non-super_admin selalu di-scope ke branch_id-nya sendiri.
     */
    public function predictionsForScope(?int $branchId, bool $isSuperAdmin): Collection
    {
        $resolvedBranchId = $branchId;

        $stocks = BranchStock::with(['item.defaultSupplier', 'branch'])
            ->when($resolvedBranchId !== null, fn ($q) => $q->where('branch_id', $resolvedBranchId))
            ->orderBy('item_id')
            ->get();

        $usageMap = $this->usageAverages($resolvedBranchId)
            ->keyBy(fn ($u) => $u['branch_id'] . ':' . $u['item_id']);

        return $stocks->map(function (BranchStock $stock) use ($usageMap) {
            $usage = $usageMap->get($stock->branch_id . ':' . $stock->item_id);
            return $this->predictForStock($stock, $usage);
        })->values();
    }
}
