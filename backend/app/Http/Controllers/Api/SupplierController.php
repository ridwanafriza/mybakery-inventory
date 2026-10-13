<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\ActivityLog;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SupplierController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $suppliers = Supplier::orderBy('name')->paginate(20);
        return SupplierResource::collection($suppliers);
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'supplier_created',
            'subject_type' => Supplier::class,
            'subject_id' => $supplier->id,
            'data' => ['name' => $supplier->name],
        ]);

        return response()->json(new SupplierResource($supplier), 201);
    }

    public function show(Supplier $supplier): SupplierResource
    {
        return new SupplierResource($supplier);
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): SupplierResource
    {
        $supplier->update($request->validated());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'supplier_updated',
            'subject_type' => Supplier::class,
            'subject_id' => $supplier->id,
            'data' => ['name' => $supplier->name],
        ]);

        return new SupplierResource($supplier);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'supplier_deleted',
            'subject_type' => Supplier::class,
            'subject_id' => $supplier->id,
            'data' => ['name' => $supplier->name],
        ]);

        $supplier->delete();
        return response()->json(['message' => 'Supplier deleted']);
    }
}
