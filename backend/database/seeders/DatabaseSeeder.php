<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Item;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    private array $branchProfiles = [
        0 => [ // Pusat — cabang utama, stok melimpah, aktivitas tinggi
            'name' => 'MyBakery Pusat',
            'address' => 'Jl. Raya Utama No. 1, Jakarta Pusat',
            'manager' => 'Budi Santoso',
            'qty_multiplier' => 1.0,
            'low_stock' => false,
            'expired_rate' => 0.1,
            'movement_count' => [40, 70],
            'movement_ratio_in' => 0.7,
        ],
        1 => [ // Bandung — stok sedang, banyak item expired
            'name' => 'MyBakery Cabang Bandung',
            'address' => 'Jl. Asia Afrika No. 88, Bandung',
            'manager' => 'Siti Rahayu',
            'qty_multiplier' => 0.75,
            'low_stock' => false,
            'expired_rate' => 0.35,
            'movement_count' => [25, 50],
            'movement_ratio_in' => 0.55,
        ],
        2 => [ // Surabaya — stok rendah, restok sering, stok keluar banyak
            'name' => 'MyBakery Cabang Surabaya',
            'address' => 'Jl. Basuki Rahmat No. 45, Surabaya',
            'manager' => 'Dewi Lestari',
            'qty_multiplier' => 0.5,
            'low_stock' => true,
            'expired_rate' => 0.1,
            'movement_count' => [35, 65],
            'movement_ratio_in' => 0.5,
        ],
        3 => [ // Yogyakarta — stok sangat rendah, banyak expired, minim aktivitas
            'name' => 'MyBakery Cabang Yogyakarta',
            'address' => 'Jl. Malioboro No. 12, Yogyakarta',
            'manager' => 'Andi Prasetyo',
            'qty_multiplier' => 0.25,
            'low_stock' => true,
            'expired_rate' => 0.5,
            'movement_count' => [10, 25],
            'movement_ratio_in' => 0.4,
        ],
        4 => [ // Semarang — cabang baru, stok awal kecil, mulai aktif
            'name' => 'MyBakery Cabang Semarang',
            'address' => 'Jl. Pandanaran No. 33, Semarang',
            'manager' => 'Rina Wulandari',
            'qty_multiplier' => 0.4,
            'low_stock' => true,
            'expired_rate' => 0.15,
            'movement_count' => [15, 35],
            'movement_ratio_in' => 0.6,
        ],
    ];

    public function run(): void
    {
        // 1. Create branches
        $branches = [];
        foreach ($this->branchProfiles as $profile) {
            $branches[] = Branch::create([
                'name' => $profile['name'],
                'address' => $profile['address'],
                'manager' => $profile['manager'],
            ]);
        }

        // 2. Create users
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mybakery.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'branch_id' => null,
        ]);

        $positions = ['Kepala Dapur', 'Staf Produksi', 'Quality Control', 'Staf Gudang', 'Operator Produksi'];
        $staffUsers = [];
        foreach ($branches as $i => $branch) {
            User::create([
                'name' => "Admin " . $branch->name,
                'email' => "admin" . ($i + 1) . "@mybakery.com",
                'password' => Hash::make('password'),
                'role' => 'branch_admin',
                'branch_id' => $branch->id,
            ]);
            $staff = User::create([
                'name' => "Staf " . $branch->name,
                'email' => "staf" . ($i + 1) . "@mybakery.com",
                'password' => Hash::make('password'),
                'role' => 'staff',
                'branch_id' => $branch->id,
                'position' => $positions[$i],
                'hire_date' => now()->subMonths(rand(3, 24)),
                'phone' => '0812-' . rand(1000, 9999) . '-' . rand(1000, 9999),
            ]);
            $staffUsers[] = $staff;
        }

        // 3. Create categories + items
        $this->call([
            CategorySeeder::class,
            SupplierSeeder::class,
        ]);

        // 4. Create BranchStock per branch x item (variasi per cabang)
        $items = Item::all();
        foreach ($branches as $branchIdx => $branch) {
            $profile = $this->branchProfiles[$branchIdx];
            $multiplier = $profile['qty_multiplier'];
            $lowStockMode = $profile['low_stock'];
            $expiredRate = $profile['expired_rate'];

            foreach ($items as $item) {
                // Base qty per item (stok ideal)
                $baseQty = match ($item->name) {
                    'Telur' => rand(80, 200),
                    'Mentega' => rand(10, 30),
                    'Susu Cair' => rand(15, 40),
                    'Keju Cheddar' => rand(5, 15),
                    'Tepung Terigu' => rand(40, 100),
                    'Gula Pasir' => rand(20, 60),
                    'Gula Halus' => rand(8, 25),
                    'Cokelat Bubuk' => rand(5, 15),
                    'Pewarna Makanan' => rand(10, 30),
                    'Es Krim Vanila' => rand(8, 20),
                    'Ragi Instan' => rand(5, 15),
                    'Vanili' => rand(3, 10),
                    'Susu Bubuk' => rand(8, 20),
                    'Minyak Sayur' => rand(10, 30),
                    'Roti Tawar' => rand(20, 50),
                    default => rand(10, 30),
                };

                // Apply multiplier
                $qty = max(1, (int) ceil($baseQty * $multiplier));

                // Low stock mode: beberapa item dipaksa sangat rendah
                if ($lowStockMode && in_array($item->name, ['Telur', 'Tepung Terigu', 'Susu Cair', 'Gula Pasir', 'Mentega'])) {
                    $qty = max(1, (int) ceil($qty * 0.2));
                }

                // Expiry: beberapa item sengaja expired
                $expiry = null;
                if ($item->is_perishable) {
                    if (rand() / getrandmax() < $expiredRate) {
                        // Sengaja expired
                        $days = match (true) {
                            $item->name === 'Telur' => rand(-15, -1),
                            $item->name === 'Mentega' => rand(-10, -1),
                            $item->name === 'Susu Cair' => rand(-7, -1),
                            $item->name === 'Keju Cheddar' => rand(-20, -1),
                            $item->name === 'Es Krim Vanila' => rand(-14, -1),
                            default => rand(-10, -1),
                        };
                    } else {
                        // Normal: belum expired
                        $days = match (true) {
                            $item->name === 'Telur' => rand(5, 45),
                            $item->name === 'Mentega' => rand(5, 30),
                            $item->name === 'Susu Cair' => rand(2, 14),
                            $item->name === 'Keju Cheddar' => rand(10, 60),
                            $item->name === 'Es Krim Vanila' => rand(3, 21),
                            default => rand(5, 30),
                        };
                    }
                    $expiry = now()->addDays($days);
                }

                BranchStock::create([
                    'branch_id' => $branch->id,
                    'item_id' => $item->id,
                    'quantity' => $qty,
                    'storage_location' => $item->is_perishable
                        ? ($item->name === 'Es Krim Vanila' ? 'freezer' : 'cold_storage')
                        : 'pantry',
                    'expiry_date' => $expiry,
                ]);
            }
        }

        // 5. Call dependent seeders (pass branch profiles)
        $this->call([
            RecipeSeeder::class,
            PurchaseOrderSeeder::class,
            StockOpnameSeeder::class,
            StockTransferSeeder::class,
        ]);

        // 6. Generate stock movements dengan pattern berbeda per cabang
        $this->seedStockMovements($branches, $staffUsers, $items);

        // 7. Generate notifikasi (low stock + expiry)
        $notifService = new NotificationService();
        $notifService->generateAll();
    }

    private function seedStockMovements(array $branches, array $staffUsers, $items): void
    {
        foreach ($branches as $branchIdx => $branch) {
            $profile = $this->branchProfiles[$branchIdx];
            $staff = $staffUsers[$branchIdx];
            $ratioIn = $profile['movement_ratio_in'];
            [$minMovements, $maxMovements] = $profile['movement_count'];

            foreach ($items as $item) {
                $movementCount = rand($minMovements, $maxMovements);
                for ($i = 0; $i < $movementCount; $i++) {
                    $type = (rand() / getrandmax()) < $ratioIn ? 'in' : 'out';

                    // Qty bervariasi per cabang
                    $baseQty = match ($item->name) {
                        'Telur' => rand(20, 100),
                        'Mentega' => rand(2, 10),
                        'Susu Cair' => rand(5, 20),
                        'Keju Cheddar' => rand(1, 5),
                        'Tepung Terigu' => rand(10, 50),
                        'Gula Pasir' => rand(5, 25),
                        'Gula Halus' => rand(2, 10),
                        'Cokelat Bubuk' => rand(1, 5),
                        'Pewarna Makanan' => rand(3, 15),
                        'Es Krim Vanila' => rand(3, 10),
                        'Ragi Instan' => rand(1, 5),
                        'Vanili' => rand(1, 3),
                        'Susu Bubuk' => rand(2, 8),
                        'Minyak Sayur' => rand(3, 10),
                        'Roti Tawar' => rand(10, 30),
                        default => rand(3, 15),
                    };

                    // Cabang low stock: qty keluar lebih agresif
                    if ($type === 'out' && $profile['low_stock']) {
                        $baseQty = (int) ceil($baseQty * 1.3);
                    }

                    $date = now()->subDays(rand(0, 365))->subHours(rand(0, 23))->subMinutes(rand(0, 59));
                    $notes = $type === 'in'
                        ? $this->randomNote('in')
                        : $this->randomNote('out');

                    StockMovement::create([
                        'branch_id' => $branch->id,
                        'item_id' => $item->id,
                        'type' => $type,
                        'quantity' => $baseQty,
                        'note' => $notes,
                        'user_id' => $staff->id,
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                }
            }
        }
    }

    private function randomNote(string $type): string
    {
        $inNotes = [
            'Restok mingguan dari supplier',
            'Pengiriman dari distributor',
            'Restok bulanan',
            'Stok awal bulan',
            'Pembelian cash',
            'Pengiriman mendadak',
            'Restok bahan kue order besar',
            'Pengadaan rutin',
            'Stok tambahan untuk event',
            'Restok karena promosi',
        ];

        $outNotes = [
            'Pemakaian produksi harian',
            'Order klien catering',
            'Pemakaian event',
            'Stok habis terjual',
            'Bahan untuk pesanan wedding',
            'Pemakaian kue ulang tahun',
            'Pengiriman order online',
            'Pemakaian demo produk',
            'Bahan expired, buang',
            'Retur ke supplier',
        ];

        return $type === 'in'
            ? $inNotes[array_rand($inNotes)]
            : $outNotes[array_rand($outNotes)];
    }
}
