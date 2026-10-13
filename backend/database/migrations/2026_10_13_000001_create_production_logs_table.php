<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity')->comment('Jumlah batch/produksi (yield × resep)');
            $table->date('produced_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'produced_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_logs');
    }
};
