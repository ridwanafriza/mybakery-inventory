<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $query = BranchStock::query();

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        $all = $query->clone()->with('item')->get();

        $totalItems = $all->count();
        $lowStock = $all->filter(fn ($s) => $s->status === 'low_stock')->count();
        $expired = $all->filter(fn ($s) => $s->status === 'expired')->count();
        $outOfStock = $all->filter(fn ($s) => $s->status === 'out_of_stock')->count();
        $goodStock = $all->filter(fn ($s) => $s->status === 'good')->count();

        // Stock by category
        $byCategory = $all->groupBy('item.category.name')->map(function ($items, $name) {
            return [
                'name' => $name ?: 'Lainnya',
                'count' => $items->count(),
                'low' => $items->filter(fn ($s) => $s->status === 'low_stock')->count(),
                'expired' => $items->filter(fn ($s) => $s->status === 'expired')->count(),
                'out' => $items->filter(fn ($s) => $s->status === 'out_of_stock')->count(),
            ];
        })->values();

        // Stock by branch
        $byBranch = Branch::withCount(['stocks as total_stocks'])
            ->when(!$request->user()->isSuperAdmin(), fn ($q) => $q->where('id', $request->user()->branch_id))
            ->get()
            ->map(function ($branch) use ($all) {
                $branchStocks = $all->filter(fn ($s) => $s->branch_id === $branch->id);
                return [
                    'name' => $branch->name,
                    'total' => $branch->total_stocks,
                    'low' => $branchStocks->filter(fn ($s) => $s->status === 'low_stock')->count(),
                    'expired' => $branchStocks->filter(fn ($s) => $s->status === 'expired')->count(),
                    'out' => $branchStocks->filter(fn ($s) => $s->status === 'out_of_stock')->count(),
                ];
            });

        // Recent movements (last 7)
        $movementQuery = StockMovement::with(['item', 'branch', 'user'])
            ->orderByDesc('created_at');
        if (!$request->user()->isSuperAdmin()) {
            $movementQuery->where('branch_id', $request->user()->branch_id);
        }
        $recentMovements = $movementQuery->take(7)->get()->map(fn ($m) => [
            'id' => $m->id,
            'item' => $m->item?->name ?? '—',
            'branch' => $m->branch?->name ?? '—',
            'type' => $m->type,
            'quantity' => $m->quantity,
            'unit' => $m->item?->unit ?? '',
            'user' => $m->user?->name ?? '—',
            'created_at' => $m->created_at->format('Y-m-d H:i'),
        ]);

        // Movement summary (last 30 days)
        $thirtyDaysAgo = now()->subDays(30);
        $movementQuery30 = StockMovement::where('created_at', '>=', $thirtyDaysAgo);
        if (!$request->user()->isSuperAdmin()) {
            $movementQuery30->where('branch_id', $request->user()->branch_id);
        }
        $movementSummary = $movementQuery30
            ->select('type', DB::raw('count(*) as total'), DB::raw('sum(quantity) as total_qty'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        // Daily movement trend (last 30 days)
        $dailyQuery = StockMovement::where('created_at', '>=', $thirtyDaysAgo);
        if (!$request->user()->isSuperAdmin()) {
            $dailyQuery->where('branch_id', $request->user()->branch_id);
        }
        $dailyMovements = $dailyQuery
            ->select(
                DB::raw('DATE(created_at) as date'),
                'type',
                DB::raw('sum(quantity) as total_qty'),
                DB::raw('count(*) as total_count')
            )
            ->groupBy('date', 'type')
            ->get()
            ->groupBy('date')
            ->map(function ($dayData, $date) {
                $in = $dayData->firstWhere('type', 'in');
                $out = $dayData->firstWhere('type', 'out');
                return [
                    'date' => $date,
                    'in_qty' => $in ? (float) $in->total_qty : 0,
                    'out_qty' => $out ? (float) $out->total_qty : 0,
                    'in_count' => $in ? (int) $in->total_count : 0,
                    'out_count' => $out ? (int) $out->total_count : 0,
                ];
            })
            ->values();

        return response()->json([
            'total_items' => $totalItems,
            'low_stock' => $lowStock,
            'expired' => $expired,
            'out_of_stock' => $outOfStock,
            'good_stock' => $goodStock,
            'by_category' => $byCategory,
            'by_branch' => $byBranch,
            'recent_movements' => $recentMovements,
            'movement_summary' => [
                'in' => [
                    'total' => $movementSummary['in']->total ?? 0,
                    'qty' => $movementSummary['in']->total_qty ?? 0,
                ],
                'out' => [
                    'total' => $movementSummary['out']->total ?? 0,
                    'qty' => $movementSummary['out']->total_qty ?? 0,
                ],
            ],
            'daily_movements' => $dailyMovements,
        ]);
    }
}
