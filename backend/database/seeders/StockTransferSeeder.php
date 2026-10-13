<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Item;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class StockTransferSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();
        $items = Item::all();
        $admins = User::where('role', 'branch_admin')->get();
        $superAdmin = User::where('role', 'super_admin')->first();

        if ($branches->count() < 2 || $items->isEmpty()) {
            return;
        }

        $transfers = [
            [
                'from' => 0,
                'to' => 3,
                'status' => 'received',
                'notes' => 'Transfer tepung ke Yogyakarta karena stok menipis',
                'items' => [['idx' => 5, 'qty' => 20], ['idx' => 6, 'qty' => 10]],
            ],
            [
                'from' => 0,
                'to' => 4,
                'status' => 'approved',
                'notes' => 'Transfer susu ke Semarang untuk order besar',
                'items' => [['idx' => 2, 'qty' => 15], ['idx' => 0, 'qty' => 30]],
            ],
            [
                'from' => 1,
                'to' => 2,
                'status' => 'pending',
                'notes' => 'Bandung kirim mentega ke Surabaya',
                'items' => [['idx' => 1, 'qty' => 5]],
            ],
            [
                'from' => 0,
                'to' => 1,
                'status' => 'rejected',
                'notes' => 'Dibatalkan, stok Bandung sudah cukup',
                'items' => [['idx' => 5, 'qty' => 10]],
            ],
        ];

        foreach ($transfers as $t) {
            $fromBranch = $branches[$t['from']];
            $toBranch = $branches[$t['to']];

            $admin = $admins->firstWhere('branch_id', $fromBranch->id) ?? $admins->first();
            $approver = $admins->firstWhere('branch_id', $toBranch->id) ?? $superAdmin;

            $transfer = StockTransfer::create([
                'from_branch_id' => $fromBranch->id,
                'to_branch_id' => $toBranch->id,
                'user_id' => $admin->id,
                'approved_by' => in_array($t['status'], ['approved', 'received']) ? $approver->id : null,
                'status' => $t['status'],
                'notes' => $t['notes'],
            ]);

            foreach ($t['items'] as $ti) {
                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'item_id' => $items[$ti['idx']]->id,
                    'quantity' => $ti['qty'],
                ]);
            }
        }
    }
}
