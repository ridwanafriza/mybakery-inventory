<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\ActivityLog;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $categories = Category::withCount('items')->orderBy('name')->paginate(20);
        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'category_created',
            'subject_type' => Category::class,
            'subject_id' => $category->id,
            'data' => ['name' => $category->name],
        ]);

        return response()->json(new CategoryResource($category), 201);
    }

    public function show(Category $category): CategoryResource
    {
        return new CategoryResource($category->loadCount('items'));
    }

    public function update(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'category_updated',
            'subject_type' => Category::class,
            'subject_id' => $category->id,
            'data' => ['name' => $category->name],
        ]);

        return new CategoryResource($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        ActivityLog::create([
            'user_id' => request()->user()->id,
            'action' => 'category_deleted',
            'subject_type' => Category::class,
            'subject_id' => $category->id,
            'data' => ['name' => $category->name],
        ]);

        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }
}
