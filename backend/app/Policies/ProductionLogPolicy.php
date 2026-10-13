<?php

namespace App\Policies;

use App\Models\ProductionLog;
use App\Models\User;

class ProductionLogPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ProductionLog $productionLog): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $productionLog->branch_id === $user->branch_id;
    }

    public function create(User $user): bool
    {
        // Semua role boleh catat produksi untuk cabangnya sendiri; super_admin semua cabang
        return $user->isSuperAdmin() || $user->isBranchAdmin() || $user->isStaff();
    }
}
