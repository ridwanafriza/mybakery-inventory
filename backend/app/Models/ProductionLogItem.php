<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionLogItem extends Model
{
    use HasFactory;

    protected $fillable = ['production_log_id', 'item_id', 'quantity_used'];

    protected function casts(): array
    {
        return [
            'quantity_used' => 'decimal:2',
        ];
    }

    public function productionLog(): BelongsTo
    {
        return $this->belongsTo(ProductionLog::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
