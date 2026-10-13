<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BranchStock;
use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StockBatch::with(['item', 'branch']);

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when($request->query('branch_id'), fn ($q, $id) => $q->where('branch_id', $id));
        }

        $query->when($request->query('item_id'), fn ($q, $id) => $q->where('item_id', $id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('expiring_soon'), fn ($q) => $q->nearExpiry((int) $request->query('expiring_soon', 7)))
            ->orderByDesc('created_at');

        $batches = $query->paginate(20);

        return response()->json([
            'data' => $batches->items(),
            'current_page' => $batches->currentPage(),
            'last_page' => $batches->lastPage(),
            'per_page' => $batches->perPage(),
            'total' => $batches->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => 'required|numeric|min:0.01',
            'production_date' => 'required|date',
            'expiry_date' => 'nullable|date|after:production_date',
            'storage_location' => 'nullable|string|max:100',
            'cost_price' => 'required|numeric|min:0',
        ]);

        $batchCode = StockBatch::generateBatchCode($request->branch_id, $request->item_id);

        $batch = DB::transaction(function () use ($request, $batchCode) {
            $batch = StockBatch::create([
                'branch_id' => $request->branch_id,
                'item_id' => $request->item_id,
                'batch_code' => $batchCode,
                'quantity' => $request->quantity,
                'production_date' => $request->production_date,
                'expiry_date' => $request->expiry_date,
                'storage_location' => $request->storage_location ?? 'pantry',
                'cost_price' => $request->cost_price,
                'status' => 'active',
            ]);

            // Update branch_stocks
            $branchStock = BranchStock::firstOrCreate(
                ['branch_id' => $request->branch_id, 'item_id' => $request->item_id],
                ['quantity' => 0, 'storage_location' => $request->storage_location ?? 'pantry']
            );
            $branchStock->increment('quantity', $request->quantity);

            // Create stock movement
            StockMovement::create([
                'branch_id' => $request->branch_id,
                'item_id' => $request->item_id,
                'type' => 'in',
                'quantity' => $request->quantity,
                'note' => "Batch {$batchCode} - Production",
                'reason' => null,
                'user_id' => $request->user()->id,
            ]);

            return $batch->load(['item', 'branch']);
        });

        return response()->json($batch, 201);
    }

    public function consume(Request $request): JsonResponse
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'item_id' => 'required|integer|exists:items,id',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $result = DB::transaction(function () use ($request) {
            $batches = StockBatch::where('branch_id', $request->branch_id)
                ->where('item_id', $request->item_id)
                ->fifo()
                ->get();

            $remaining = $request->quantity;
            $consumed = [];

            foreach ($batches as $batch) {
                if ($remaining <= 0) break;

                $take = min($batch->quantity, $remaining);
                $batch->decrement('quantity', $take);
                $remaining -= $take;

                $consumed[] = [
                    'batch_code' => $batch->batch_code,
                    'quantity_taken' => $take,
                ];

                if ($batch->quantity <= 0) {
                    $batch->update(['status' => 'depleted']);
                }
            }

            if ($remaining > 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'quantity' => 'Stok batch tidak mencukupi. Kurang: ' . $remaining,
                ]);
            }

            // Update branch_stocks
            BranchStock::where('branch_id', $request->branch_id)
                ->where('item_id', $request->item_id)
                ->decrement('quantity', $request->quantity);

            // Create stock movement
            StockMovement::create([
                'branch_id' => $request->branch_id,
                'item_id' => $request->item_id,
                'type' => 'out',
                'quantity' => $request->quantity,
                'note' => 'FIFO batch consume',
                'reason' => $request->input('reason'),
                'user_id' => $request->user()->id,
            ]);

            return $consumed;
        });

        return response()->json([
            'message' => 'Berhasil mengonsumsi stok dari ' . count($result) . ' batch',
            'consumed' => $result,
        ]);
    }

    public function dispose(Request $request, StockBatch $stockBatch): JsonResponse
    {
        if ($stockBatch->status !== 'active' || $stockBatch->quantity <= 0) {
            return response()->json(['message' => 'Batch tidak aktif atau sudah habis'], 400);
        }

        DB::transaction(function () use ($request, $stockBatch) {
            $quantity = $stockBatch->quantity;

            $stockBatch->update([
                'quantity' => 0,
                'status' => 'disposed',
            ]);

            // Update branch_stocks
            BranchStock::where('branch_id', $stockBatch->branch_id)
                ->where('item_id', $stockBatch->item_id)
                ->decrement('quantity', $quantity);

            // Create stock movement
            StockMovement::create([
                'branch_id' => $stockBatch->branch_id,
                'item_id' => $stockBatch->item_id,
                'type' => 'out',
                'quantity' => $quantity,
                'note' => "Batch {$stockBatch->batch_code} disposed",
                'reason' => $request->input('reason', 'expired'),
                'user_id' => $request->user()->id,
            ]);
        });

        return response()->json(['message' => 'Batch berhasil didisposisi']);
    }

    public function summary(Request $request): JsonResponse
    {
        $query = StockBatch::selectRaw('item_id, SUM(quantity) as total_qty, COUNT(*) as batch_count')
            ->where('status', 'active')
            ->groupBy('item_id');

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when($request->query('branch_id'), fn ($q, $id) => $q->where('branch_id', $id));
        }

        $summary = $query->with('item:id,name,unit')
            ->get()
            ->map(fn ($row) => [
                'item_id' => $row->item_id,
                'item_name' => $row->item->name ?? '-',
                'unit' => $row->item->unit ?? '-',
                'total_quantity' => round($row->total_qty, 2),
                'batch_count' => $row->batch_count,
            ]);

        return response()->json(['data' => $summary]);
    }
}
