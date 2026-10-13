<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductionLogRequest;
use App\Http\Resources\ProductionLogResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\ProductionLog;
use App\Models\Recipe;
use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProductionLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ProductionLog::with(['branch', 'recipe', 'user', 'items.item'])
            ->orderByDesc('produced_at')
            ->orderByDesc('id');

        // Scope per cabang — non-super_admin hanya lihat cabangnya
        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when(
                $request->query('branch_id'),
                fn ($q, $branchId) => $q->where('branch_id', $branchId)
            );
        }

        $query->when($request->query('recipe_id'), fn ($q, $id) => $q->where('recipe_id', $id))
            ->when($request->query('from_date'), fn ($q, $date) => $q->whereDate('produced_at', '>=', $date))
            ->when($request->query('to_date'), fn ($q, $date) => $q->whereDate('produced_at', '<=', $date));

        return ProductionLogResource::collection($query->paginate(20));
    }

    public function store(StoreProductionLogRequest $request): JsonResponse
    {
        $user = $request->user();

        // Scoping cabang: non-super_admin hanya boleh catat produksi untuk cabangnya sendiri
        if (!$user->isSuperAdmin() && (int) $request->branch_id !== (int) $user->branch_id) {
            return response()->json(['message' => 'Tidak bisa mencatat produksi untuk cabang lain'], 403);
        }

        $recipe = Recipe::with('items.item')->findOrFail($request->recipe_id);
        $quantity = (int) $request->quantity;
        $branchId = (int) $request->branch_id;

        if ($recipe->items->isEmpty()) {
            return response()->json(['message' => 'Resep tidak memiliki daftar bahan'], 422);
        }

        // Hitung ulang kebutuhan bahan di backend — jangan percaya angka dari FE.
        $needs = $recipe->items->map(fn ($ri) => [
            'item_id' => $ri->item_id,
            'item_name' => $ri->item->name ?? '-',
            'unit' => $ri->item->unit ?? '-',
            'qty_needed' => round($ri->quantity * $quantity, 2),
        ])->values();

        try {
            $result = DB::transaction(function () use ($needs, $branchId, $quantity, $recipe, $request, $user) {
                $stocks = BranchStock::where('branch_id', $branchId)
                    ->whereIn('item_id', $needs->pluck('item_id'))
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('item_id');

                // Validasi ketersediaan SEMUA bahan dulu — kalau ada yang kurang, tolak semua (tanpa potong stok sebagian).
                $missing = [];
                foreach ($needs as $need) {
                    $stock = $stocks->get($need['item_id']);
                    $available = $stock ? (float) $stock->quantity : 0;
                    if ($available < $need['qty_needed']) {
                        $missing[] = [
                            'item_id' => $need['item_id'],
                            'item_name' => $need['item_name'],
                            'unit' => $need['unit'],
                            'qty_needed' => $need['qty_needed'],
                            'available' => $available,
                            'deficit' => round($need['qty_needed'] - $available, 2),
                        ];
                    }
                }

                if ($missing) {
                    throw new InsufficientStockException($missing);
                }

                $log = ProductionLog::create([
                    'branch_id' => $branchId,
                    'recipe_id' => $recipe->id,
                    'user_id' => $user->id,
                    'quantity' => $quantity,
                    'produced_at' => $request->produced_at,
                    'notes' => $request->notes,
                ]);

                foreach ($needs as $need) {
                    $qty = $need['qty_needed'];

                    BranchStock::where('branch_id', $branchId)
                        ->where('item_id', $need['item_id'])
                        ->decrement('quantity', $qty);

                    StockMovement::create([
                        'branch_id' => $branchId,
                        'item_id' => $need['item_id'],
                        'type' => 'out',
                        'quantity' => $qty,
                        'note' => "Produksi {$recipe->name} — {$quantity} batch (Log #{$log->id})",
                        'reason' => 'production',
                        'user_id' => $user->id,
                    ]);

                    // Konsumsi batch FIFO untuk item yang punya batch aktif di cabang ini
                    $this->consumeBatches($branchId, $need['item_id'], $qty);

                    $log->items()->create([
                        'item_id' => $need['item_id'],
                        'quantity_used' => $qty,
                    ]);
                }

                ActivityLog::create([
                    'user_id' => $user->id,
                    'action' => 'production_recorded',
                    'subject_type' => ProductionLog::class,
                    'subject_id' => $log->id,
                    'data' => [
                        'branch_id' => $branchId,
                        'recipe_id' => $recipe->id,
                        'recipe_name' => $recipe->name,
                        'quantity' => $quantity,
                        'items_count' => $needs->count(),
                    ],
                ]);

                return $log;
            });
        } catch (InsufficientStockException $e) {
            // Transaksi sudah di-rollback (semua bahan ditolak, tidak ada yang terpotong)
            return response()->json([
                'message' => 'Stok bahan tidak mencukupi: ' . $e->detail(),
                'missing' => $e->missing,
            ], 422);
        }

        $result->load(['branch', 'recipe', 'user', 'items.item']);

        return response()->json(new ProductionLogResource($result), 201);
    }

    /**
     * Konsumsi batch FIFO (pola sama dengan StockBatchController::consume) tanpa
     * menggagalkan produksi — branch_stocks sudah divalidasi & didekrement terpisah.
     */
    private function consumeBatches(int $branchId, int $itemId, float $quantity): void
    {
        $batches = StockBatch::where('branch_id', $branchId)
            ->where('item_id', $itemId)
            ->fifo()
            ->get();

        $remaining = $quantity;

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            $take = min((float) $batch->quantity, $remaining);
            $batch->decrement('quantity', $take);
            $remaining -= $take;

            if ($batch->quantity <= 0) {
                $batch->update(['status' => 'depleted']);
            }
        }
    }
}
