<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StockBatchController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\StockPredictionController;
use App\Http\Controllers\Api\StockTransferController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProductionLogController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json(['message' => 'pong']));

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

Route::get('/user', [AuthController::class, 'me'])
    ->middleware('auth:sanctum');

Route::put('/user/profile', [AuthController::class, 'updateProfile'])
    ->middleware('auth:sanctum');

// Protected routes — semua endpoint data wajib pakai branch.scope
Route::middleware(['auth:sanctum', 'branch.scope'])->group(function () {

    // Branches — super admin bisa CRUD, semua user bisa lihat
    Route::get('/branches', [BranchController::class, 'index']);
    Route::get('/branches/{branch}', [BranchController::class, 'show']);
    Route::middleware('can:viewAny,App\Models\Branch')->group(function () {
        Route::post('/branches', [BranchController::class, 'store']);
        Route::put('/branches/{branch}', [BranchController::class, 'update']);
        Route::delete('/branches/{branch}', [BranchController::class, 'destroy']);
    });

    // Categories — semua user bisa lihat, admin+ bisa CRUD
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store'])
        ->middleware('can:create,App\Models\Category');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])
        ->middleware('can:update,category');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->middleware('can:delete,category');

    // Items — semua user bisa lihat, admin+ bisa CRUD
    Route::get('/items', [ItemController::class, 'index']);
    Route::get('/items/scan/{barcode}', [ItemController::class, 'scan']);
    Route::get('/items/{item}', [ItemController::class, 'show']);
    Route::post('/items', [ItemController::class, 'store'])
        ->middleware('can:create,App\Models\Item');
    Route::put('/items/{item}', [ItemController::class, 'update'])
        ->middleware('can:update,item');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])
        ->middleware('can:delete,item');

    // Suppliers — semua user bisa lihat, admin+ bisa CRUD
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show']);
    Route::post('/suppliers', [SupplierController::class, 'store'])
        ->middleware('can:create,App\Models\Supplier');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])
        ->middleware('can:update,supplier');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])
        ->middleware('can:delete,supplier');

    // Staff — super admin bisa lihat & update data staff
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/staff/{staff}', [StaffController::class, 'show']);
    Route::put('/staff/{staff}', [StaffController::class, 'update']);

    // Recipes — semua user bisa lihat, admin+ bisa CRUD
    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::get('/recipes/{recipe}', [RecipeController::class, 'show']);
    Route::post('/recipes/{recipe}/calculate', [RecipeController::class, 'calculate']);
    Route::post('/recipes', [RecipeController::class, 'store'])
        ->middleware('can:create,App\Models\Recipe');
    Route::put('/recipes/{recipe}', [RecipeController::class, 'update'])
        ->middleware('can:update,recipe');
    Route::delete('/recipes/{recipe}', [RecipeController::class, 'destroy'])
        ->middleware('can:delete,recipe');

    // Finance — super admin only
    Route::middleware('can:viewAny,App\Models\Recipe')->group(function () {
        Route::get('/finance/hpp', [FinanceController::class, 'index']);
        Route::get('/finance/hpp/{recipe}', [FinanceController::class, 'hpp']);
        Route::get('/finance/loss-report', [FinanceController::class, 'lossReport']);
    });

    // Purchase Orders — admin+ bisa CRUD, super admin approve
    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::get('/purchase-orders/suggestions', [PurchaseOrderController::class, 'suggestions']);
    Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])
        ->middleware('can:create,App\Models\PurchaseOrder');
    Route::put('/purchase-orders/{purchaseOrder}/status', [PurchaseOrderController::class, 'updateStatus'])
        ->middleware('can:update,purchaseOrder');
    Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy'])
        ->middleware('can:delete,purchaseOrder');

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Stock Batches — batch management
    Route::get('/stock-batches', [StockBatchController::class, 'index']);
    Route::get('/stock-batches/summary', [StockBatchController::class, 'summary']);
    Route::post('/stock-batches', [StockBatchController::class, 'store']);
    Route::post('/stock-batches/consume', [StockBatchController::class, 'consume']);
    Route::put('/stock-batches/{stockBatch}/dispose', [StockBatchController::class, 'dispose']);

    // Stock Overview — lihat semua stok per cabang
    Route::get('/stock-overview', [StockMovementController::class, 'stockOverview']);

    // Stock Predictions (Fase 15) — estimasi habis & reorder point (scoped per cabang)
    Route::get('/stock-predictions', [StockPredictionController::class, 'index']);
    Route::get('/stock-predictions/reorder', [StockPredictionController::class, 'reorderSuggestions']);

    // Stock Movements — semua user bisa lihat & input
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store']);
    Route::post('/stock-movements/bulk', [StockMovementController::class, 'bulkStore']);

    // Production Logs (Catat Produksi) — semua role bisa catat untuk cabangnya sendiri
    Route::get('/production-logs', [ProductionLogController::class, 'index']);
    Route::post('/production-logs', [ProductionLogController::class, 'store'])
        ->middleware('can:create,App\Models\ProductionLog');

    // Stock Opname — semua user bisa buat, admin+ bisa approve
    Route::get('/stock-opnames', [StockOpnameController::class, 'index']);
    Route::get('/stock-opnames/{stockOpname}', [StockOpnameController::class, 'show']);
    Route::post('/stock-opnames', [StockOpnameController::class, 'store'])
        ->middleware('can:create,App\Models\StockOpname');
    Route::put('/stock-opnames/{stockOpname}/submit', [StockOpnameController::class, 'submit'])
        ->middleware('can:update,stockOpname');
    Route::put('/stock-opnames/{stockOpname}/approve', [StockOpnameController::class, 'approve'])
        ->middleware('can:approve,stockOpname');
    Route::delete('/stock-opnames/{stockOpname}', [StockOpnameController::class, 'destroy'])
        ->middleware('can:delete,stockOpname');

    // Stock Transfers — admin+ bisa buat, admin cabang tujuan approve/received
    Route::get('/stock-transfers', [StockTransferController::class, 'index']);
    Route::get('/stock-transfers/{stockTransfer}', [StockTransferController::class, 'show']);
    Route::post('/stock-transfers', [StockTransferController::class, 'store'])
        ->middleware('can:create,App\Models\StockTransfer');
    Route::put('/stock-transfers/{stockTransfer}/approve', [StockTransferController::class, 'approve'])
        ->middleware('can:approve,stockTransfer');
    Route::put('/stock-transfers/{stockTransfer}/received', [StockTransferController::class, 'received'])
        ->middleware('can:received,stockTransfer');
    Route::put('/stock-transfers/{stockTransfer}/reject', [StockTransferController::class, 'reject'])
        ->middleware('can:reject,stockTransfer');
    Route::delete('/stock-transfers/{stockTransfer}', [StockTransferController::class, 'destroy'])
        ->middleware('can:delete,stockTransfer');

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    // Export — semua user bisa export (data di-scope per cabang)
    Route::get('/export/dashboard', [ExportController::class, 'dashboard']);
    Route::get('/export/stock-movements', [ExportController::class, 'stockMovements']);
    Route::get('/export/loss-report', [ExportController::class, 'lossReport']);
    Route::get('/export/hpp', [ExportController::class, 'hpp']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);
});
