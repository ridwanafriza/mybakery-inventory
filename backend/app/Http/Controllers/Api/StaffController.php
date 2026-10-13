<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateStaffRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StaffController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::with('branch')
            ->whereIn('role', ['branch_admin', 'staff'])
            ->orderBy('name');

        if ($request->query('branch_id')) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->query('role')) {
            $query->where('role', $request->query('role'));
        }

        return UserResource::collection($query->get());
    }

    public function show(User $staff): UserResource
    {
        return new UserResource($staff->load('branch'));
    }

    public function update(UpdateStaffRequest $request, User $staff): UserResource
    {
        $staff->update($request->validated());
        $staff->load('branch');
        return new UserResource($staff);
    }
}
