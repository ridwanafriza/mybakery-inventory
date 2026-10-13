<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';
    protected $description = 'Generate low stock and expiry notifications';

    public function handle(): int
    {
        $service = new NotificationService();
        $result = $service->generateAll();

        $this->info("Low stock notifications: {$result['low_stock']}");
        $this->info("Expiry notifications: {$result['expiry']}");

        return Command::SUCCESS;
    }
}
