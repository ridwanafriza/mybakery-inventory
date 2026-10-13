<?php

namespace App\Policies;

use App\Models\PurchaseOrder;
use App\Models\User;

class PurchaseOrderPolicy
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
        return $user->isSuperAdmin() || $user->isBranchAdmin();
    }

    public function update(User $user, PurchaseOrder $purchaseOrder): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isBranchAdmin() && $purchaseOrder->branch_id === $user->branch_id) {
            return true;
        }

        return false;
    }

    public function approve(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, PurchaseOrder $purchaseOrder): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isBranchAdmin() && $purchaseOrder->branch_id === $user->branch_id && $purchaseOrder->status === 'draft') {
            return true;
        }

        return false;
    }
}
