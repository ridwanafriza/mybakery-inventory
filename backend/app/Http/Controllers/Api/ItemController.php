<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Http\Resources\ItemResource;
use App\Http\Resources\BranchStockResource;
use App\Models\ActivityLog;
use App\Models\BranchStock;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Item::with(['category', 'defaultSupplier'])
            ->when($request->query('category_id'), fn ($q, $categoryId) => $q->where('category_id', $categoryId))
            ->orderBy('name')
            ->paginate(20);

        return ItemResource::collection($items);
    }

    public function store(StoreItemRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('items', 'public');
        }

        if (empty($data['barcode'])) {
            $data['barcode'] = Item::generateBarcode();
        }

        $item = Item::create($data);
        $item->load(['category', 'defaultSupplier']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'item_created',
            'subject_type' => Item::class,
            'subject_id' => $item->id,
            'data' => ['name' => $item->name, 'category' => $item->category->name ?? ''],
        ]);

        return response()->json(new ItemResource($item), 201);
    }

    public function show(Item $item): ItemResource
    {
        return new ItemResource($item->load('category'));
    }

    public function update(UpdateItemRequest $request, Item $item): ItemResource
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('items', 'public');
        }

        $item->update($data);
        $item->load(['category', 'defaultSupplier']);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'item_updated',
            'subject_type' => Item::class,
            'subject_id' => $item->id,
            'data' => ['name' => $item->name],
        ]);

        return new ItemResource($item);
    }

    public function destroy(Item $item): JsonResponse
    {
        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'item_deleted',
            'subject_type' => Item::class,
            'subject_id' => $item->id,
            'data' => ['name' => $item->name],
        ]);

        $item->delete();
        return response()->json(['message' => 'Item deleted']);
    }

    public function scan(Request $request, string $barcode): JsonResponse
    {
        $item = Item::with('category')->where('barcode', $barcode)->first();

        if (!$item) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $stocks = BranchStock::with(['branch'])
            ->where('item_id', $item->id)
            ->get()
            ->map(fn (BranchStock $bs) => new BranchStockResource($bs));

        return response()->json([
            'item' => new ItemResource($item),
            'stocks' => $stocks,
        ]);
    }
}
