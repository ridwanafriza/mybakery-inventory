<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_get_role(): void
    {
        $branch = Branch::factory()->create();
        $user = User::factory()->create([
            'role' => 'staff',
            'branch_id' => $branch->id,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'staff')
            ->assertJsonPath('user.branch_id', $branch->id);
    }

    public function test_super_admin_can_see_all_branches(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'branch_id' => null]);
        Branch::factory()->count(3)->create();

        $response = $this->actingAs($admin)
            ->getJson('/api/branches');

        $response->assertOk()
            ->assertJsonCount(3);
    }

    public function test_branch_admin_can_only_see_own_branch(): void
    {
        $branch1 = Branch::factory()->create();
        $branch2 = Branch::factory()->create();

        $admin = User::factory()->create([
            'role' => 'branch_admin',
            'branch_id' => $branch1->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/branches');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => $branch1->id]);
    }

    public function test_staff_can_only_see_own_branch(): void
    {
        $branch1 = Branch::factory()->create();
        $branch2 = Branch::factory()->create();

        $staff = User::factory()->create([
            'role' => 'staff',
            'branch_id' => $branch1->id,
        ]);

        $response = $this->actingAs($staff)
            ->getJson('/api/branches');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => $branch1->id]);
    }

    public function test_branch_admin_cannot_create_branch(): void
    {
        $branch = Branch::factory()->create();
        $admin = User::factory()->create([
            'role' => 'branch_admin',
            'branch_id' => $branch->id,
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/branches', [
                'name' => 'New Branch',
                'address' => 'Some address',
                'manager' => 'Some manager',
            ]);

        $response->assertForbidden();
    }

    public function test_staff_cannot_create_branch(): void
    {
        $branch = Branch::factory()->create();
        $staff = User::factory()->create([
            'role' => 'staff',
            'branch_id' => $branch->id,
        ]);

        $response = $this->actingAs($staff)
            ->postJson('/api/branches', [
                'name' => 'New Branch',
                'address' => 'Some address',
                'manager' => 'Some manager',
            ]);

        $response->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_protected_routes(): void
    {
        $response = $this->getJson('/api/branches');
        $response->assertUnauthorized();
    }

    public function test_login_rate_limiting(): void
    {
        $branch = Branch::factory()->create();
        $user = User::factory()->create([
            'role' => 'staff',
            'branch_id' => $branch->id,
        ]);

        // Make 5 failed attempts (should be allowed)
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        // 6th attempt should be rate limited
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }
}
