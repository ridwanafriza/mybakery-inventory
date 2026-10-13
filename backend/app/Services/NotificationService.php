<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function generateLowStockNotifications(): int
    {
        $count = 0;
        $lowStocks = BranchStock::with(['item', 'branch'])
            ->where('quantity', '>', 0)
            ->whereRaw('quantity <= (SELECT threshold FROM items WHERE items.id = branch_stocks.item_id)')
            ->get();

        foreach ($lowStocks as $bs) {
            $admin = User::where('role', 'branch_admin')
                ->where('branch_id', $bs->branch_id)
                ->first();

            if (!$admin) {
                continue;
            }

            $exists = Notification::where('user_id', $admin->id)
                ->where('type', 'low_stock')
                ->where('data->item_id', $bs->item_id)
                ->where('data->branch_id', $bs->branch_id)
                ->whereNull('read_at')
                ->exists();

            if ($exists) {
                continue;
            }

            Notification::create([
                'user_id' => $admin->id,
                'type' => 'low_stock',
                'title' => 'Stok Menipis',
                'message' => "{$bs->item->name} di {$bs->branch->name} tersisa {$bs->quantity} {$bs->item->unit} (threshold: {$bs->item->threshold})",
                'data' => [
                    'item_id' => $bs->item_id,
                    'branch_id' => $bs->branch_id,
                    'quantity' => $bs->quantity,
                    'threshold' => $bs->item->threshold,
                ],
            ]);
            $count++;
        }

        return $count;
    }

    public function generateExpiryNotifications(): int
    {
        $count = 0;
        $expiringSoon = BranchStock::with(['item', 'branch'])
            ->where('quantity', '>', 0)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays(7))
            ->where('expiry_date', '>=', now())
            ->get();

        foreach ($expiringSoon as $bs) {
            $admin = User::where('role', 'branch_admin')
                ->where('branch_id', $bs->branch_id)
                ->first();

            if (!$admin) {
                continue;
            }

            $exists = Notification::where('user_id', $admin->id)
                ->where('type', 'expiry')
                ->where('data->item_id', $bs->item_id)
                ->where('data->branch_id', $bs->branch_id)
                ->whereNull('read_at')
                ->exists();

            if ($exists) {
                continue;
            }

            $daysLeft = (int) now()->diffInDays($bs->expiry_date, false);

            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expiry',
                'title' => 'Stok Akan Kadaluarsa',
                'message' => "{$bs->item->name} di {$bs->branch->name} akan kadaluarsa dalam {$daysLeft} hari ({$bs->quantity} {$bs->item->unit})",
                'data' => [
                    'item_id' => $bs->item_id,
                    'branch_id' => $bs->branch_id,
                    'quantity' => $bs->quantity,
                    'expiry_date' => $bs->expiry_date->format('Y-m-d'),
                    'days_left' => $daysLeft,
                ],
            ]);
            $count++;
        }

        return $count;
    }

    public function generateAll(): array
    {
        return [
            'low_stock' => $this->generateLowStockNotifications(),
            'expiry' => $this->generateExpiryNotifications(),
        ];
    }
}
