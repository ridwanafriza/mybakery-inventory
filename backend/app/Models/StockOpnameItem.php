<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockOpnameItem extends Model
{
    use HasFactory;

    protected $fillable = ['stock_opname_id', 'item_id', 'qty_system', 'qty_fisik', 'selisih'];

    protected function casts(): array
    {
        return [
            'qty_system' => 'decimal:2',
            'qty_fisik' => 'decimal:2',
            'selisih' => 'decimal:2',
        ];
    }

    public function stockOpname(): BelongsTo
    {
        return $this->belongsTo(StockOpname::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
