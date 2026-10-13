<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'contact_person', 'phone', 'email', 'address', 'lead_time_days'];

    protected function casts(): array
    {
        return [
            'lead_time_days' => 'integer',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'default_supplier_id');
    }
}
