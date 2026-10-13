<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BranchStock extends Model
{
    use HasFactory;

    protected $fillable = ['branch_id', 'item_id', 'quantity', 'storage_location', 'expiry_date'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
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

    /**
     * Status dihitung otomatis, bukan diinput manual.
     * Priority: out_of_stock > expired > low_stock > good
     */
    public function getStatusAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }

        if ($this->expiry_date && $this->expiry_date->isPast()) {
            return 'expired';
        }

        $threshold = $this->item->threshold ?? 0;
        if ($this->quantity <= $threshold) {
            return 'low_stock';
        }

        return 'good';
    }
}
