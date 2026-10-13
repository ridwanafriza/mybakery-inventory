<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class StockBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id', 'item_id', 'batch_code', 'quantity',
        'production_date', 'expiry_date', 'storage_location',
        'cost_price', 'status',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'production_date' => 'date',
            'expiry_date' => 'date',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')->where('quantity', '>', 0);
    }

    public function scopeNearExpiry(Builder $query, int $days = 7): Builder
    {
        return $query->where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays($days))
            ->where('expiry_date', '>=', now());
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', now());
    }

    public function scopeFifo(Builder $query): Builder
    {
        return $query->active()->orderBy('production_date', 'asc');
    }

    public static function generateBatchCode(int $branchId, int $itemId): string
    {
        $prefix = 'BT-' . str_pad($branchId, 2, '0', STR_PAD_LEFT) . str_pad($itemId, 3, '0', STR_PAD_LEFT);
        $count = static::where('batch_code', 'like', $prefix . '%')->count();
        return $prefix . '-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
    }
}
