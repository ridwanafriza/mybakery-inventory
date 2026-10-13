<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'role' => ['sometimes', 'string', 'in:super_admin,branch_admin,staff'],
            'branch_id' => ['sometimes', 'nullable', 'integer', 'exists:branches,id'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'staff',
            'branch_id' => $validated['branch_id'] ?? null,
        ]);

        Auth::login($user);

        $request->session()->regenerate();

        return response()->json([
            'user' => $user->load('branch'),
            'message' => 'Registration successful',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => Auth::user()->load('branch'),
            'message' => 'Login successful',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('branch'));
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());
        return response()->json($user->load('branch'));
    }
}
