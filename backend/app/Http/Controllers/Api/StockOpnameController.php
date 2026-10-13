<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockOpnameRequest;
use App\Http\Requests\SubmitStockOpnameRequest;
use App\Http\Resources\StockOpnameResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class StockOpnameController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockOpname::with(['branch', 'user', 'approver', 'items.item'])
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

        $opnames = $query->paginate(20);

        return StockOpnameResource::collection($opnames);
    }

    public function store(StoreStockOpnameRequest $request): JsonResponse
    {
        $stockOpname = DB::transaction(function () use ($request) {
            $opname = StockOpname::create([
                'branch_id' => $request->branch_id,
                'user_id' => $request->user()->id,
                'status' => 'draft',
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                $branchStock = BranchStock::where('branch_id', $request->branch_id)
                    ->where('item_id', $item['item_id'])
                    ->first();

                $qtySystem = $branchStock ? $branchStock->quantity : 0;
                $qtyFisik = $item['qty_fisik'];
                $selisih = $qtyFisik - $qtySystem;

                $opname->items()->create([
                    'item_id' => $item['item_id'],
                    'qty_system' => $qtySystem,
                    'qty_fisik' => $qtyFisik,
                    'selisih' => $selisih,
                ]);
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'stock_opname_created',
                'subject_type' => StockOpname::class,
                'subject_id' => $opname->id,
                'data' => [
                    'branch_id' => $request->branch_id,
                    'items_count' => count($request->items),
                ],
            ]);

            return $opname;
        });

        $stockOpname->load(['branch', 'user', 'items.item']);

        return response()->json(new StockOpnameResource($stockOpname), 201);
    }

    public function show(StockOpname $stockOpname): StockOpnameResource
    {
        $stockOpname->load(['branch', 'user', 'approver', 'items.item']);

        return new StockOpnameResource($stockOpname);
    }

    public function submit(SubmitStockOpnameRequest $request, StockOpname $stockOpname): JsonResponse
    {
        if ($stockOpname->status !== 'draft') {
            return response()->json(['message' => 'Hanya opname draft yang bisa disubmit'], 422);
        }

        DB::transaction(function () use ($request, $stockOpname) {
            foreach ($request->items as $itemData) {
                $opnameItem = StockOpnameItem::where('stock_opname_id', $stockOpname->id)
                    ->where('id', $itemData['id'])
                    ->first();

                if ($opnameItem) {
                    $selisih = $itemData['qty_fisik'] - $opnameItem->qty_system;
                    $opnameItem->update([
                        'qty_fisik' => $itemData['qty_fisik'],
                        'selisih' => $selisih,
                    ]);
                }
            }

            $stockOpname->update(['status' => 'pending_approval']);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'stock_opname_submitted',
                'subject_type' => StockOpname::class,
                'subject_id' => $stockOpname->id,
                'data' => ['branch_id' => $stockOpname->branch_id],
            ]);
        });

        $stockOpname->load(['branch', 'user', 'items.item']);

        return response()->json(new StockOpnameResource($stockOpname));
    }

    public function approve(Request $request, StockOpname $stockOpname): JsonResponse
    {
        if ($stockOpname->status !== 'pending_approval') {
            return response()->json(['message' => 'Hanya opname pending approval yang bisa di-approve'], 422);
        }

        if ($stockOpname->user_id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa approve opname yang dibuat sendiri'], 422);
        }

        DB::transaction(function () use ($request, $stockOpname) {
            $stockOpname->items->each(function ($item) use ($request) {
                if ($item->selisih != 0) {
                    $branchStock = BranchStock::where('branch_id', $stockOpname->branch_id)
                        ->where('item_id', $item->item_id)
                        ->first();

                    if ($branchStock) {
                        if ($item->selisih > 0) {
                            $branchStock->increment('quantity', $item->selisih);
                            $type = 'in';
                        } else {
                            $branchStock->decrement('quantity', abs($item->selisih));
                            $type = 'out';
                        }

                        StockMovement::create([
                            'branch_id' => $stockOpname->branch_id,
                            'item_id' => $item->item_id,
                            'type' => $type,
                            'quantity' => abs($item->selisih),
                            'note' => "Stock opname #{$stockOpname->id} — selisih {$item->selisih}",
                            'user_id' => $request->user()->id,
                        ]);
                    }
                }
            });

            $stockOpname->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
            ]);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'stock_opname_approved',
                'subject_type' => StockOpname::class,
                'subject_id' => $stockOpname->id,
                'data' => ['branch_id' => $stockOpname->branch_id],
            ]);
        });

        $stockOpname->load(['branch', 'user', 'approver', 'items.item']);

        return response()->json(new StockOpnameResource($stockOpname));
    }

    public function destroy(StockOpname $stockOpname): JsonResponse
    {
        if ($stockOpname->status === 'approved') {
            return response()->json(['message' => 'Opname yang sudah di-approve tidak bisa dihapus'], 422);
        }

        $stockOpname->items()->delete();
        $stockOpname->delete();

        return response()->json(['message' => 'Stock opname deleted']);
    }
}
