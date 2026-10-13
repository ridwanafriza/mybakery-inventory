<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Item extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'category_id', 'unit', 'threshold', 'is_perishable', 'cost_price', 'image', 'barcode', 'default_supplier_id'];

    protected function casts(): array
    {
        return [
            'threshold' => 'integer',
            'is_perishable' => 'boolean',
            'cost_price' => 'decimal:2',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function defaultSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'default_supplier_id');
    }

    public static function generateBarcode(): string
    {
        $lastItem = static::orderByDesc('id')->first();
        $nextId = $lastItem ? $lastItem->id + 1 : 1;
        return 'MYB-' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
    }
}
