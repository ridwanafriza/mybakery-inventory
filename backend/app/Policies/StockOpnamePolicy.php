<?php

namespace App\Policies;

use App\Models\StockOpname;
use App\Models\User;

class StockOpnamePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isBranchAdmin() || $user->isStaff();
    }

    public function update(User $user, StockOpname $stockOpname): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isBranchAdmin() && $stockOpname->branch_id === $user->branch_id) {
            return true;
        }

        return false;
    }

    public function approve(User $user, StockOpname $stockOpname): bool
    {
        if ($stockOpname->status !== 'pending_approval') {
            return false;
        }

        if ($stockOpname->user_id === $user->id) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isBranchAdmin() && $stockOpname->branch_id === $user->branch_id) {
            return true;
        }

        return false;
    }

    public function delete(User $user, StockOpname $stockOpname): bool
    {
        if ($stockOpname->status === 'approved') {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isBranchAdmin() && $stockOpname->branch_id === $user->branch_id && $stockOpname->status === 'draft') {
            return true;
        }

        return false;
    }
}
