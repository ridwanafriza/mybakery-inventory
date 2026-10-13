<?php

namespace App\Policies;

use App\Models\User;

class RecipePolicy
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

    public function update(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isBranchAdmin();
    }

    public function delete(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
