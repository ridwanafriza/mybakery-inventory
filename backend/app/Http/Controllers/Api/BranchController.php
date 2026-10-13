<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBranchRequest;
use App\Http\Requests\UpdateBranchRequest;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        if ($request->user()->isSuperAdmin()) {
            $branches = Branch::all();
        } else {
            $branches = $request->user()->branch ? collect([$request->user()->branch]) : collect();
        }

        return BranchResource::collection($branches);
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        $branch = Branch::create($request->validated());
        return response()->json(new BranchResource($branch), 201);
    }

    public function show(Branch $branch): BranchResource
    {
        return new BranchResource($branch);
    }

    public function update(UpdateBranchRequest $request, Branch $branch): BranchResource
    {
        $branch->update($request->validated());
        return new BranchResource($branch);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();
        return response()->json(['message' => 'Branch deleted']);
    }
}
