<?php

namespace Database\Seeders;

use App\Models\Item;
use Illuminate\Database\Seeder;

class BarcodeSeeder extends Seeder
{
    public function run(): void
    {
        Item::whereNull('barcode')->each(function (Item $item) {
            $item->barcode = 'MYB-' . str_pad($item->id, 5, '0', STR_PAD_LEFT);
            $item->save();
        });
    }
}
