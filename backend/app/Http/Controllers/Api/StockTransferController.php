<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockTransferRequest;
use App\Http\Resources\StockTransferResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class StockTransferController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockTransfer::with(['fromBranch', 'toBranch', 'user', 'approver', 'items.item']);

        if (!$request->user()->isSuperAdmin()) {
            $query->where(function ($q) use ($request) {
                $q->where('from_branch_id', $request->user()->branch_id)
                    ->orWhere('to_branch_id', $request->user()->branch_id);
            });
        }

        $query->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return StockTransferResource::collection($query->paginate(20));
    }

    public function show(StockTransfer $stockTransfer): StockTransferResource
    {
        $stockTransfer->load(['fromBranch', 'toBranch', 'user', 'approver', 'items.item']);

        return new StockTransferResource($stockTransfer);
    }

    public function store(StoreStockTransferRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $transfer = DB::transaction(function () use ($validated, $request) {
            $transfer = StockTransfer::create([
                'from_branch_id' => $validated['from_branch_id'],
                'to_branch_id' => $validated['to_branch_id'],
                'user_id' => $request->user()->id,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $transfer->load(['fromBranch', 'toBranch', 'user', 'items.item']);
        });

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'transfer_created',
            'subject_type' => StockTransfer::class,
            'subject_id' => $transfer->id,
            'data' => ['from' => $transfer->fromBranch->name ?? '', 'to' => $transfer->toBranch->name ?? '', 'items_count' => $transfer->items->count()],
        ]);

        return response()->json([
            'message' => 'Transfer stok berhasil dibuat',
            'data' => new StockTransferResource($transfer),
        ], 201);
    }

    public function approve(Request $request, StockTransfer $stockTransfer): JsonResponse
    {
        if ($stockTransfer->status !== 'pending') {
            return response()->json(['message' => 'Transfer sudah diproses sebelumnya'], 422);
        }

        DB::transaction(function () use ($stockTransfer, $request) {
            $stockTransfer->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
            ]);
        });

        $stockTransfer->load(['fromBranch', 'toBranch', 'user', 'approver', 'items.item']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'transfer_approved',
            'subject_type' => StockTransfer::class,
            'subject_id' => $stockTransfer->id,
            'data' => ['from' => $stockTransfer->fromBranch->name ?? '', 'to' => $stockTransfer->toBranch->name ?? ''],
        ]);

        return response()->json([
            'message' => 'Transfer stok disetujui',
            'data' => new StockTransferResource($stockTransfer),
        ]);
    }

    public function received(Request $request, StockTransfer $stockTransfer): JsonResponse
    {
        if ($stockTransfer->status !== 'approved') {
            return response()->json(['message' => 'Transfer belum disetujui'], 422);
        }

        DB::transaction(function () use ($stockTransfer, $request) {
            foreach ($stockTransfer->items as $transferItem) {
                $fromStock = BranchStock::where('branch_id', $stockTransfer->from_branch_id)
                    ->where('item_id', $transferItem->item_id)
                    ->first();

                if (!$fromStock || $fromStock->quantity < $transferItem->quantity) {
                    $itemName = $transferItem->item->name ?? "ID {$transferItem->item_id}";
                    $available = $fromStock ? $fromStock->quantity : 0;
                    abort(422, "Stok '{$itemName}' di cabang asal tidak mencukupi (tersedia: {$available}, dibutuhkan: {$transferItem->quantity})");
                }

                $fromStock->decrement('quantity', $transferItem->quantity);

                StockMovement::create([
                    'branch_id' => $stockTransfer->from_branch_id,
                    'item_id' => $transferItem->item_id,
                    'type' => 'out',
                    'quantity' => $transferItem->quantity,
                    'note' => "Transfer ke cabang {$stockTransfer->toBranch->name}",
                    'user_id' => $request->user()->id,
                ]);

                $toStock = BranchStock::firstOrCreate(
                    [
                        'branch_id' => $stockTransfer->to_branch_id,
                        'item_id' => $transferItem->item_id,
                    ],
                    [
                        'quantity' => 0,
                        'storage_location' => 'pantry',
                    ]
                );

                $toStock->increment('quantity', $transferItem->quantity);

                StockMovement::create([
                    'branch_id' => $stockTransfer->to_branch_id,
                    'item_id' => $transferItem->item_id,
                    'type' => 'in',
                    'quantity' => $transferItem->quantity,
                    'note' => "Transfer dari cabang {$stockTransfer->fromBranch->name}",
                    'user_id' => $request->user()->id,
                ]);
            }

            $stockTransfer->update(['status' => 'received']);
        });

        $stockTransfer->load(['fromBranch', 'toBranch', 'user', 'approver', 'items.item']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'transfer_received',
            'subject_type' => StockTransfer::class,
            'subject_id' => $stockTransfer->id,
            'data' => ['from' => $stockTransfer->fromBranch->name ?? '', 'to' => $stockTransfer->toBranch->name ?? ''],
        ]);

        return response()->json([
            'message' => 'Transfer stok diterima, stok telah diperbarui',
            'data' => new StockTransferResource($stockTransfer),
        ]);
    }

    public function destroy(StockTransfer $stockTransfer): JsonResponse
    {
        if (!in_array($stockTransfer->status, ['pending'])) {
            return response()->json(['message' => 'Hanya transfer pending yang bisa dibatalkan'], 422);
        }

        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'transfer_deleted',
            'subject_type' => StockTransfer::class,
            'subject_id' => $stockTransfer->id,
            'data' => ['from' => $stockTransfer->fromBranch->name ?? '', 'to' => $stockTransfer->toBranch->name ?? ''],
        ]);

        $stockTransfer->delete();

        return response()->json(['message' => 'Transfer stok dibatalkan']);
    }

    public function reject(Request $request, StockTransfer $stockTransfer): JsonResponse
    {
        if ($stockTransfer->status !== 'pending') {
            return response()->json(['message' => 'Hanya transfer pending yang bisa ditolak'], 422);
        }

        $stockTransfer->update(['status' => 'rejected']);

        $stockTransfer->load(['fromBranch', 'toBranch', 'user', 'items.item']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'transfer_rejected',
            'subject_type' => StockTransfer::class,
            'subject_id' => $stockTransfer->id,
            'data' => ['from' => $stockTransfer->fromBranch->name ?? '', 'to' => $stockTransfer->toBranch->name ?? ''],
        ]);

        return response()->json([
            'message' => 'Transfer stok ditolak',
            'data' => new StockTransferResource($stockTransfer),
        ]);
    }
}
