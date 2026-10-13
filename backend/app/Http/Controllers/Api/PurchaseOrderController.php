<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Http\Requests\UpdatePurchaseOrderStatusRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\Item;
use App\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PurchaseOrder::with(['supplier', 'branch', 'user', 'items.item'])
            ->orderByDesc('created_at');

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('branch_id') && $request->branch_id !== '') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->user()->isBranchAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        $purchaseOrders = $query->paginate(20);

        return PurchaseOrderResource::collection($purchaseOrders);
    }

    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $purchaseOrder = DB::transaction(function () use ($request) {
            $po = PurchaseOrder::create([
                'supplier_id' => $request->supplier_id,
                'branch_id' => $request->branch_id,
                'user_id' => $request->user()->id,
                'status' => 'draft',
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                $po->items()->create([
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);
            }

            return $po;
        });

        $purchaseOrder->load(['supplier', 'branch', 'user', 'items.item']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'po_created',
            'subject_type' => PurchaseOrder::class,
            'subject_id' => $purchaseOrder->id,
            'data' => ['supplier' => $purchaseOrder->supplier->name ?? '', 'branch' => $purchaseOrder->branch->name ?? '', 'total' => $purchaseOrder->total],
        ]);

        return response()->json(new PurchaseOrderResource($purchaseOrder), 201);
    }

    public function show(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        $purchaseOrder->load(['supplier', 'branch', 'user', 'items.item']);

        return new PurchaseOrderResource($purchaseOrder);
    }

    public function updateStatus(UpdatePurchaseOrderStatusRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $oldStatus = $purchaseOrder->status;
        $purchaseOrder->update(['status' => $request->status]);
        $purchaseOrder->load(['supplier', 'branch', 'user', 'items.item']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'po_status_updated',
            'subject_type' => PurchaseOrder::class,
            'subject_id' => $purchaseOrder->id,
            'data' => ['old_status' => $oldStatus, 'new_status' => $request->status, 'supplier' => $purchaseOrder->supplier->name ?? ''],
        ]);

        return response()->json(new PurchaseOrderResource($purchaseOrder));
    }

    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'po_deleted',
            'subject_type' => PurchaseOrder::class,
            'subject_id' => $purchaseOrder->id,
            'data' => ['supplier' => $purchaseOrder->supplier->name ?? ''],
        ]);

        $purchaseOrder->delete();
        return response()->json(['message' => 'Purchase order deleted']);
    }

    public function suggestions(Request $request): JsonResponse
    {
        $branchId = $request->user()->branch_id;
        if ($request->user()->isSuperAdmin() && $request->has('branch_id')) {
            $branchId = $request->branch_id;
        }

        $lowStockItems = BranchStock::where('branch_id', $branchId)
            ->where('quantity', '>', 0)
            ->whereColumn('quantity', '<=', DB::raw('(SELECT threshold FROM items WHERE items.id = branch_stocks.item_id)'))
            ->with('item')
            ->get();

        $outOfStockItems = BranchStock::where('branch_id', $branchId)
            ->where('quantity', 0)
            ->with('item')
            ->get();

        $suggestions = $lowStockItems->concat($outOfStockItems)->map(function ($stock) {
            return [
                'item_id' => $stock->item_id,
                'item_name' => $stock->item->name,
                'unit' => $stock->item->unit,
                'current_quantity' => $stock->quantity,
                'threshold' => $stock->item->threshold,
                'suggested_quantity' => max(0, $stock->item->threshold * 2 - $stock->quantity),
            ];
        });

        return response()->json(['data' => $suggestions->values()]);
    }
}
