<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->string('storage_location')->default('pantry');
            $table->date('expiry_date')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_stocks');
    }
};
