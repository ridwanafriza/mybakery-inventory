<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RecipeResource;
use App\Models\Item;
use App\Models\Recipe;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $recipes = Recipe::with('items.item')->orderBy('name')->get();

        $data = $recipes->map(fn (Recipe $recipe) => [
            'id' => $recipe->id,
            'name' => $recipe->name,
            'description' => $recipe->description,
            'items_count' => $recipe->items->count(),
            'hpp' => $recipe->hpp,
        ]);

        return response()->json(['data' => $data]);
    }

    public function hpp(Recipe $recipe): JsonResponse
    {
        $recipe->load('items.item');

        $items = $recipe->items->map(fn ($ri) => [
            'item_id' => $ri->item_id,
            'item_name' => $ri->item->name,
            'unit' => $ri->item->unit,
            'quantity' => $ri->quantity,
            'cost_price' => $ri->item->cost_price ?? 0,
            'subtotal' => $ri->quantity * ($ri->item->cost_price ?? 0),
        ]);

        return response()->json([
            'data' => [
                'id' => $recipe->id,
                'name' => $recipe->name,
                'description' => $recipe->description,
                'items' => $items,
                'total_hpp' => $recipe->hpp,
            ],
        ]);
    }

    public function lossReport(Request $request): JsonResponse
    {
        $query = StockMovement::with(['item', 'branch'])
            ->where('type', 'out')
            ->whereIn('reason', ['expired', 'damaged']);

        if ($request->query('branch_id')) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->query('start_date')) {
            $query->whereDate('created_at', '>=', $request->query('start_date'));
        }

        if ($request->query('end_date')) {
            $query->whereDate('created_at', '<=', $request->query('end_date'));
        }

        $movements = $query->orderBy('created_at', 'desc')->get();

        $grouped = $movements->groupBy('item_id')->map(function ($items, $itemId) {
            $item = $items->first()->item;
            $totalQty = $items->sum('quantity');
            $totalLoss = $items->sum(fn ($m) => $m->quantity * ($m->item->cost_price ?? 0));

            return [
                'item_id' => $itemId,
                'item_name' => $item->name,
                'unit' => $item->unit,
                'cost_price' => $item->cost_price ?? 0,
                'total_quantity' => $totalQty,
                'total_loss' => $totalLoss,
                'movements_count' => $items->count(),
            ];
        })->values();

        $grandTotal = $grouped->sum('total_loss');

        return response()->json([
            'data' => $grouped,
            'grand_total' => $grandTotal,
        ]);
    }
}
