<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('batch_code', 50);
            $table->decimal('quantity', 12, 2)->default(0);
            $table->date('production_date');
            $table->date('expiry_date')->nullable();
            $table->string('storage_location')->default('pantry');
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->enum('status', ['active', 'depleted', 'expired', 'disposed'])->default('active');
            $table->timestamps();

            $table->unique(['branch_id', 'item_id', 'batch_code']);
            $table->index(['branch_id', 'item_id', 'status']);
            $table->index('expiry_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
    }
};
