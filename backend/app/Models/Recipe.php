<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description'];

    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    public function getHppAttribute(): float
    {
        return $this->items->sum(fn (RecipeItem $ri) => $ri->quantity * ($ri->item->cost_price ?? 0));
    }
}
