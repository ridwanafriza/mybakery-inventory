<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_log_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_log_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity_used', 12, 2);
            $table->timestamps();

            $table->unique(['production_log_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_log_items');
    }
};
