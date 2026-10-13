<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Item;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Dairy'],
            ['name' => 'Dry Goods'],
            ['name' => 'Frozen'],
            ['name' => 'Wet Ingredients'],
            ['name' => 'Packaging'],
            ['name' => 'Flavorings'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }

        $dairy = Category::where('name', 'Dairy')->first();
        $dryGoods = Category::where('name', 'Dry Goods')->first();
        $frozen = Category::where('name', 'Frozen')->first();
        $wet = Category::where('name', 'Wet Ingredients')->first();
        $packaging = Category::where('name', 'Packaging')->first();
        $flavor = Category::where('name', 'Flavorings')->first();

        $items = [
            // Wet Ingredients
            ['name' => 'Telur', 'category_id' => $wet->id, 'unit' => 'pcs', 'threshold' => 50, 'is_perishable' => true, 'cost_price' => 2500],
            ['name' => 'Mentega', 'category_id' => $dairy->id, 'unit' => 'kg', 'threshold' => 5, 'is_perishable' => true, 'cost_price' => 45000],

            // Dairy
            ['name' => 'Susu Cair', 'category_id' => $dairy->id, 'unit' => 'liter', 'threshold' => 10, 'is_perishable' => true, 'cost_price' => 18000],
            ['name' => 'Keju Cheddar', 'category_id' => $dairy->id, 'unit' => 'kg', 'threshold' => 3, 'is_perishable' => true, 'cost_price' => 85000],
            ['name' => 'Susu Bubuk', 'category_id' => $dairy->id, 'unit' => 'kg', 'threshold' => 5, 'is_perishable' => false, 'cost_price' => 65000],

            // Dry Goods
            ['name' => 'Tepung Terigu', 'category_id' => $dryGoods->id, 'unit' => 'kg', 'threshold' => 20, 'is_perishable' => false, 'cost_price' => 12000],
            ['name' => 'Gula Pasir', 'category_id' => $dryGoods->id, 'unit' => 'kg', 'threshold' => 10, 'is_perishable' => false, 'cost_price' => 15000],
            ['name' => 'Gula Halus', 'category_id' => $dryGoods->id, 'unit' => 'kg', 'threshold' => 5, 'is_perishable' => false, 'cost_price' => 18000],
            ['name' => 'Cokelat Bubuk', 'category_id' => $dryGoods->id, 'unit' => 'kg', 'threshold' => 3, 'is_perishable' => false, 'cost_price' => 55000],
            ['name' => 'Ragi Instan', 'category_id' => $dryGoods->id, 'unit' => 'kg', 'threshold' => 2, 'is_perishable' => false, 'cost_price' => 35000],
            ['name' => 'Minyak Sayur', 'category_id' => $dryGoods->id, 'unit' => 'liter', 'threshold' => 5, 'is_perishable' => false, 'cost_price' => 14000],

            // Wet Ingredients
            ['name' => 'Pewarna Makanan', 'category_id' => $wet->id, 'unit' => 'pcs', 'threshold' => 5, 'is_perishable' => false, 'cost_price' => 5000],

            // Frozen
            ['name' => 'Es Krim Vanila', 'category_id' => $frozen->id, 'unit' => 'kg', 'threshold' => 5, 'is_perishable' => true, 'cost_price' => 42000],

            // Flavorings
            ['name' => 'Vanili', 'category_id' => $flavor->id, 'unit' => 'pcs', 'threshold' => 3, 'is_perishable' => false, 'cost_price' => 8000],

            // Packaging
            ['name' => 'Roti Tawar', 'category_id' => $packaging->id, 'unit' => 'pcs', 'threshold' => 10, 'is_perishable' => true, 'cost_price' => 3500],
        ];

        foreach ($items as $item) {
            Item::create($item);
        }
    }
}
