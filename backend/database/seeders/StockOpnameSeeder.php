<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class StockOpnameSeeder extends Seeder
{
    private array $branchOpnameConfig = [
        0 => [ // Pusat — rutin, banyak opname
            ['status' => 'approved', 'items_count' => 5, 'notes' => 'Opname rutin bulanan — Pusat', 'selisih_range' => [-3, 4]],
            ['status' => 'approved', 'items_count' => 4, 'notes' => 'Opname akhir kuartal', 'selisih_range' => [-2, 3]],
            ['status' => 'pending_approval', 'items_count' => 3, 'notes' => 'Opname mingguan, menunggu approve', 'selisih_range' => [-1, 2]],
        ],
        1 => [ // Bandung — ada beberapa selisih besar (expired)
            ['status' => 'approved', 'items_count' => 4, 'notes' => 'Opname bulanan — Bandung', 'selisih_range' => [-5, 2]],
            ['status' => 'pending_approval', 'items_count' => 3, 'notes' => 'Opname dadakan karena banyak expired', 'selisih_range' => [-4, 1]],
        ],
        2 => [ // Surabaya — sering opname, banyak selisih
            ['status' => 'approved', 'items_count' => 5, 'notes' => 'Opname rutin — Surabaya', 'selisih_range' => [-3, 5]],
            ['status' => 'pending_approval', 'items_count' => 4, 'notes' => 'Opname karena stok sering habis', 'selisih_range' => [-2, 3]],
            ['status' => 'draft', 'items_count' => 3, 'notes' => 'Opname dadakan minggu ini', 'selisih_range' => [0, 0]],
        ],
        3 => [ // Yogyakarta — jarang opname, selisih kecil
            ['status' => 'approved', 'items_count' => 3, 'notes' => 'Opname bulanan — Yogyakarta', 'selisih_range' => [-1, 1]],
        ],
        4 => [ // Semarang — baru mulai, 1 opname pending
            ['status' => 'pending_approval', 'items_count' => 3, 'notes' => 'Opname pertama cabang baru', 'selisih_range' => [-2, 2]],
        ],
    ];

    public function run(): void
    {
        $branches = Branch::all();
        $staffUsers = User::where('role', 'staff')->get();
        $adminUsers = User::where('role', 'branch_admin')->get();
        $superAdmin = User::where('role', 'super_admin')->first();

        foreach ($branches as $branchIdx => $branch) {
            $staff = $staffUsers->firstWhere('branch_id', $branch->id);
            $admin = $adminUsers->firstWhere('branch_id', $branch->id);
            $branchStocks = BranchStock::where('branch_id', $branch->id)->get();

            if ($branchStocks->isEmpty() || !$staff) {
                continue;
            }

            $config = $this->branchOpnameConfig[$branchIdx] ?? [];

            foreach ($config as $opnameIdx => $opnameConfig) {
                $opname = StockOpname::create([
                    'branch_id' => $branch->id,
                    'user_id' => $staff->id,
                    'status' => $opnameConfig['status'],
                    'approved_by' => $opnameConfig['status'] === 'approved'
                        ? ($admin?->id ?? $superAdmin->id)
                        : null,
                    'notes' => $opnameConfig['notes'],
                ]);

                $takeStocks = $branchStocks->random(min($opnameConfig['items_count'], $branchStocks->count()));
                [$minSelisih, $maxSelisih] = $opnameConfig['selisih_range'];

                foreach ($takeStocks as $bs) {
                    if ($opnameConfig['status'] === 'draft') {
                        $qtyFisik = null;
                        $selisih = null;
                    } else {
                        $selisih = rand($minSelisih, $maxSelisih);
                        $qtyFisik = $bs->quantity + $selisih;
                    }

                    StockOpnameItem::create([
                        'stock_opname_id' => $opname->id,
                        'item_id' => $bs->item_id,
                        'qty_system' => $bs->quantity,
                        'qty_fisik' => $qtyFisik,
                        'selisih' => $selisih,
                    ]);
                }

                // Activity log
                $action = match ($opnameConfig['status']) {
                    'approved' => 'stock_opname_approved',
                    'pending_approval' => 'stock_opname_submitted',
                    default => 'stock_opname_created',
                };

                ActivityLog::create([
                    'user_id' => $opnameConfig['status'] === 'approved'
                        ? ($admin?->id ?? $superAdmin->id)
                        : $staff->id,
                    'action' => $action,
                    'subject_type' => StockOpname::class,
                    'subject_id' => $opname->id,
                    'data' => ['branch_id' => $branch->id],
                    'created_at' => now()->subDays(rand(1, 14))->subHours(rand(0, 23)),
                ]);
            }
        }
    }
}
