<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRecipeRequest;
use App\Http\Requests\UpdateRecipeRequest;
use App\Http\Resources\RecipeResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\Item;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RecipeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $recipes = Recipe::with('items.item')->orderBy('name')->paginate(20);
        return RecipeResource::collection($recipes);
    }

    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $recipe = DB::transaction(function () use ($request) {
            $recipe = Recipe::create([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            foreach ($request->items as $item) {
                $recipe->items()->create([
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $recipe->load('items.item');
        });

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'recipe_created',
            'subject_type' => Recipe::class,
            'subject_id' => $recipe->id,
            'data' => ['name' => $recipe->name, 'items_count' => $recipe->items->count()],
        ]);

        return response()->json(new RecipeResource($recipe), 201);
    }

    public function show(Recipe $recipe): RecipeResource
    {
        $recipe->load('items.item');
        return new RecipeResource($recipe);
    }

    public function update(UpdateRecipeRequest $request, Recipe $recipe): RecipeResource
    {
        $recipe = DB::transaction(function () use ($request, $recipe) {
            $recipe->update($request->only(['name', 'description']));

            if ($request->has('items')) {
                $recipe->items()->delete();
                foreach ($request->items as $item) {
                    $recipe->items()->create([
                        'item_id' => $item['item_id'],
                        'quantity' => $item['quantity'],
                    ]);
                }
            }

            return $recipe->load('items.item');
        });

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'recipe_updated',
            'subject_type' => Recipe::class,
            'subject_id' => $recipe->id,
            'data' => ['name' => $recipe->name],
        ]);

        return new RecipeResource($recipe);
    }

    public function destroy(Recipe $recipe): JsonResponse
    {
        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'recipe_deleted',
            'subject_type' => Recipe::class,
            'subject_id' => $recipe->id,
            'data' => ['name' => $recipe->name],
        ]);

        $recipe->delete();
        return response()->json(['message' => 'Recipe deleted']);
    }

    public function calculate(Request $request, Recipe $recipe): JsonResponse
    {
        $request->validate([
            'yield' => 'required|integer|min:1',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $recipe->load('items.item');
        $yield = (int) $request->input('yield', 1);
        $branchId = $request->input('branch_id');

        $ingredients = $recipe->items->map(function ($ri) use ($yield, $branchId) {
            $qtyNeeded = $ri->quantity * $yield;
            $stockAvailable = 0;

            if ($branchId) {
                $stockAvailable = BranchStock::where('item_id', $ri->item_id)
                    ->where('branch_id', $branchId)
                    ->sum('quantity');
            } else {
                $stockAvailable = BranchStock::where('item_id', $ri->item_id)
                    ->sum('quantity');
            }

            $sufficient = $stockAvailable >= $qtyNeeded;
            $deficit = $sufficient ? 0 : $qtyNeeded - $stockAvailable;

            return [
                'item_id' => $ri->item_id,
                'item_name' => $ri->item->name ?? '-',
                'barcode' => $ri->item->barcode ?? null,
                'unit' => $ri->item->unit ?? '-',
                'qty_per_batch' => $ri->quantity,
                'qty_needed' => $qtyNeeded,
                'stock_available' => round($stockAvailable, 2),
                'sufficient' => $sufficient,
                'deficit' => round($deficit, 2),
                'cost_per_unit' => $ri->item->cost_price ?? 0,
                'subtotal' => round($qtyNeeded * ($ri->item->cost_price ?? 0), 2),
            ];
        });

        $totalCost = $ingredients->sum('subtotal');
        $costPerUnit = $yield > 0 ? round($totalCost / $yield, 2) : 0;
        $sufficientCount = $ingredients->filter(fn ($i) => $i['sufficient'])->count();
        $insufficientCount = $ingredients->count() - $sufficientCount;

        return response()->json([
            'recipe' => [
                'id' => $recipe->id,
                'name' => $recipe->name,
                'description' => $recipe->description,
            ],
            'yield' => $yield,
            'branch_id' => $branchId,
            'ingredients' => $ingredients,
            'total_cost' => $totalCost,
            'cost_per_unit' => $costPerUnit,
            'summary' => [
                'total_ingredients' => $ingredients->count(),
                'sufficient' => $sufficientCount,
                'insufficient' => $insufficientCount,
                'all_sufficient' => $insufficientCount === 0,
            ],
        ]);
    }
}
