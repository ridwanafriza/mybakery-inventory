<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Item;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    private array $branchPOConfig = [
        0 => [ // Pusat — aktif, banyak PO
            'pos' => [
                ['status' => 'draft', 'items' => [2, 4], 'notes' => 'PO rutin bulanan, menunggu review'],
                ['status' => 'sent', 'items' => [3, 5], 'notes' => 'Sudah dikirim ke supplier, menunggu pengiriman'],
                ['status' => 'received', 'items' => [2, 3], 'notes' => 'Barang sudah diterima lengkap'],
            ],
        ],
        1 => [ // Bandung — sedang
            'pos' => [
                ['status' => 'draft', 'items' => [2, 3], 'notes' => 'PO tambahan karena banyak expired'],
                ['status' => 'received', 'items' => [3, 4], 'notes' => 'Restok untuk ganti stok expired'],
            ],
        ],
        2 => [ // Surabaya — sering restok
            'pos' => [
                ['status' => 'sent', 'items' => [2, 5], 'notes' => 'PO mendesak, stok hampir habis'],
                ['status' => 'received', 'items' => [3, 4], 'notes' => 'Pengiriman cepat dari supplier'],
                ['status' => 'draft', 'items' => [2, 3], 'notes' => 'PO lanjutan minggu depan'],
            ],
        ],
        3 => [ // Yogyakarta — minim aktivitas
            'pos' => [
                ['status' => 'draft', 'items' => [2, 2], 'notes' => 'PO pertama, masih menunggu approval'],
            ],
        ],
        4 => [ // Semarang — cabang baru, mulai order
            'pos' => [
                ['status' => 'sent', 'items' => [3, 3], 'notes' => 'PO awal pembukaan cabang'],
                ['status' => 'draft', 'items' => [2, 4], 'notes' => 'PO kedua, restok rutin pertama'],
            ],
        ],
    ];

    public function run(): void
    {
        $suppliers = Supplier::all();
        $branches = Branch::all();
        $items = Item::all();
        $admins = User::where('role', 'branch_admin')->get();

        if ($suppliers->isEmpty() || $branches->isEmpty() || $items->isEmpty()) {
            return;
        }

        foreach ($branches as $branchIdx => $branch) {
            $config = $this->branchPOConfig[$branchIdx] ?? ['pos' => []];
            $admin = $admins->firstWhere('branch_id', $branch->id) ?? $admins->first();

            foreach ($config['pos'] as $poConfig) {
                $supplier = $suppliers->random();

                $po = PurchaseOrder::create([
                    'supplier_id' => $supplier->id,
                    'branch_id' => $branch->id,
                    'user_id' => $admin->id,
                    'status' => $poConfig['status'],
                    'notes' => $poConfig['notes'],
                ]);

                $poItems = $items->random(rand($poConfig['items'][0], $poConfig['items'][1]));
                foreach ($poItems as $item) {
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $po->id,
                        'item_id' => $item->id,
                        'quantity' => rand(10, 50),
                        'unit_price' => $item->cost_price ?? rand(5000, 50000),
                    ]);
                }
            }
        }
    }
}
