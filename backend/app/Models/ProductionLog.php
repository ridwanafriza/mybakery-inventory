<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionLog extends Model
{
    use HasFactory;

    protected $fillable = ['branch_id', 'recipe_id', 'user_id', 'quantity', 'produced_at', 'notes'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'produced_at' => 'date',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProductionLogItem::class);
    }
}
