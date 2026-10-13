<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class BranchScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && !$user->isSuperAdmin() && $user->branch_id) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        return $next($request);
    }
}
