<?php

namespace App\Policies;

use App\Models\StockTransfer;
use App\Models\User;

class StockTransferPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, StockTransfer $transfer): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $transfer->from_branch_id === $user->branch_id
            || $transfer->to_branch_id === $user->branch_id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'branch_admin' || $user->isSuperAdmin();
    }

    public function approve(User $user, StockTransfer $transfer): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->role === 'branch_admin'
            && $transfer->to_branch_id === $user->branch_id
            && $transfer->status === 'pending';
    }

    public function received(User $user, StockTransfer $transfer): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->role === 'branch_admin'
            && $transfer->to_branch_id === $user->branch_id
            && $transfer->status === 'approved';
    }

    public function delete(User $user, StockTransfer $transfer): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->role === 'branch_admin'
            && $transfer->from_branch_id === $user->branch_id
            && $transfer->status === 'pending';
    }

    public function reject(User $user, StockTransfer $transfer): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->role === 'branch_admin'
            && $transfer->to_branch_id === $user->branch_id
            && $transfer->status === 'pending';
    }
}
