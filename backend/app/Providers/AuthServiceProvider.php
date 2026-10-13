<?php

namespace App\Providers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Item;
use App\Models\ProductionLog;
use App\Models\PurchaseOrder;
use App\Models\Recipe;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\StockTransfer;
use App\Models\Supplier;
use App\Policies\BranchPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\ItemPolicy;
use App\Policies\ProductionLogPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\RecipePolicy;
use App\Policies\StockMovementPolicy;
use App\Policies\StockOpnamePolicy;
use App\Policies\StockTransferPolicy;
use App\Policies\SupplierPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Branch::class => BranchPolicy::class,
        Category::class => CategoryPolicy::class,
        Item::class => ItemPolicy::class,
        ProductionLog::class => ProductionLogPolicy::class,
        PurchaseOrder::class => PurchaseOrderPolicy::class,
        Recipe::class => RecipePolicy::class,
        StockMovement::class => StockMovementPolicy::class,
        StockOpname::class => StockOpnamePolicy::class,
        StockTransfer::class => StockTransferPolicy::class,
        Supplier::class => SupplierPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
