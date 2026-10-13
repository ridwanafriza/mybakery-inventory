<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockMovementRequest;
use App\Http\Resources\BranchStockResource;
use App\Http\Resources\StockMovementResource;
use App\Models\BranchStock;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockMovement::with(['item', 'user']);

        // Enforce branch scope for non-super-admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when(
                $request->query('branch_id'),
                fn ($q, $branchId) => $q->where('branch_id', $branchId)
            );
        }

        $query->when(
                $request->query('item_id'),
                fn ($q, $itemId) => $q->where('item_id', $itemId)
            )
            ->when(
                $request->query('type'),
                fn ($q, $type) => $q->where('type', $type)
            )
            ->when(
                $request->query('from_date'),
                fn ($q, $date) => $q->whereDate('created_at', '>=', $date)
            )
            ->when(
                $request->query('to_date'),
                fn ($q, $date) => $q->whereDate('created_at', '<=', $date)
            )
            ->orderByDesc('created_at');

        return StockMovementResource::collection($query->paginate(20));
    }

    public function store(StoreStockMovementRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($validated, $userId) {
            $branchStock = BranchStock::firstOrCreate(
                [
                    'branch_id' => $validated['branch_id'],
                    'item_id' => $validated['item_id'],
                ],
                [
                    'quantity' => 0,
                    'storage_location' => $validated['storage_location'] ?? 'pantry',
                    'expiry_date' => $validated['expiry_date'] ?? null,
                ]
            );

            if ($validated['type'] === 'out') {
                if ($branchStock->quantity < $validated['quantity']) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'quantity' => 'Stok tidak mencukupi. Stok tersedia: ' . $branchStock->quantity,
                    ]);
                }
                $branchStock->decrement('quantity', $validated['quantity']);
            } else {
                $branchStock->increment('quantity', $validated['quantity']);

                if (!empty($validated['expiry_date'])) {
                    $branchStock->expiry_date = $validated['expiry_date'];
                }
                if (!empty($validated['storage_location'])) {
                    $branchStock->storage_location = $validated['storage_location'];
                }
                $branchStock->save();
            }

            $movement = StockMovement::create([
                'branch_id' => $validated['branch_id'],
                'item_id' => $validated['item_id'],
                'type' => $validated['type'],
                'quantity' => $validated['quantity'],
                'note' => $validated['note'] ?? null,
                'reason' => $validated['reason'] ?? null,
                'user_id' => $userId,
            ]);

            return $movement->load(['item', 'user']);
        });

        return response()->json([
            'movement' => new StockMovementResource($result),
            'stock' => new BranchStockResource(
                BranchStock::where('branch_id', $validated['branch_id'])
                    ->where('item_id', $validated['item_id'])
                    ->with(['item', 'branch'])
                    ->first()
            ),
        ], 201);
    }

    public function stockOverview(Request $request): AnonymousResourceCollection
    {
        $query = BranchStock::with(['item.category', 'branch'])
            ->when(
                $request->query('branch_id'),
                fn ($q, $branchId) => $q->where('branch_id', $branchId)
            )
            ->when(
                $request->query('item_id'),
                fn ($q, $itemId) => $q->where('item_id', $itemId)
            )
            ->when(
                $request->query('status'),
                function ($q, $status) {
                    match ($status) {
                        'out_of_stock' => $q->where('quantity', '<=', 0),
                        'expired' => $q->where('expiry_date', '<', now())->where('quantity', '>', 0),
                        'low_stock' => $q->where('quantity', '>', 0)
                            ->whereRaw('quantity <= (SELECT threshold FROM items WHERE items.id = branch_stocks.item_id)')
                            ->where(function ($q2) {
                                $q2->whereNull('expiry_date')->orWhere('expiry_date', '>=', now());
                            }),
                        'good' => $q->where('quantity', '>', 0)
                            ->whereRaw('quantity > (SELECT threshold FROM items WHERE items.id = branch_stocks.item_id)')
                            ->where(function ($q2) {
                                $q2->whereNull('expiry_date')->orWhere('expiry_date', '>=', now());
                            }),
                        default => null,
                    };
                }
            )
            ->orderByDesc('updated_at');

        return BranchStockResource::collection($query->get());
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'type' => 'required|in,in,out',
            'note' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $userId = $request->user()->id;
        $branchId = $request->branch_id;
        $type = $request->type;
        $note = $request->note;

        $results = DB::transaction(function () use ($branchId, $type, $note, $userId, $request) {
            $created = [];

            foreach ($request->items as $item) {
                $branchStock = BranchStock::firstOrCreate(
                    ['branch_id' => $branchId, 'item_id' => $item['item_id']],
                    ['quantity' => 0, 'storage_location' => 'pantry']
                );

                if ($type === 'out') {
                    if ($branchStock->quantity < $item['quantity']) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            "items.{$item['item_id']}.quantity" => 'Stok tidak mencukupi untuk item ID ' . $item['item_id'] . '. Stok tersedia: ' . $branchStock->quantity,
                        ]);
                    }
                    $branchStock->decrement('quantity', $item['quantity']);
                } else {
                    $branchStock->increment('quantity', $item['quantity']);
                }

                $movement = StockMovement::create([
                    'branch_id' => $branchId,
                    'item_id' => $item['item_id'],
                    'type' => $type,
                    'quantity' => $item['quantity'],
                    'note' => $note,
                    'user_id' => $userId,
                ]);

                $created[] = $movement->load(['item', 'user']);
            }

            return $created;
        });

        return response()->json([
            'message' => count($results) . ' stock movement berhasil dibuat',
            'data' => StockMovementResource::collection($results),
        ], 201);
    }
}
