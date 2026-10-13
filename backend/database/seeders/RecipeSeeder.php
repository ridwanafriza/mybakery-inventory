<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Recipe;
use Illuminate\Database\Seeder;

class RecipeSeeder extends Seeder
{
    public function run(): void
    {
        $tepung = Item::where('name', 'Tepung Terigu')->first();
        $gula = Item::where('name', 'Gula Pasir')->first();
        $gulaHalus = Item::where('name', 'Gula Halus')->first();
        $telur = Item::where('name', 'Telur')->first();
        $mentega = Item::where('name', 'Mentega')->first();
        $susu = Item::where('name', 'Susu Cair')->first();
        $keju = Item::where('name', 'Keju Cheddar')->first();
        $cokelat = Item::where('name', 'Cokelat Bubuk')->first();
        $ragi = Item::where('name', 'Ragi Instan')->first();
        $vanili = Item::where('name', 'Vanili')->first();
        $pewarna = Item::where('name', 'Pewarna Makanan')->first();

        $recipes = [
            [
                'name' => 'Roti Tawar Gandum',
                'description' => 'Roti tawar gandum premium untuk sarapan',
                'items' => [
                    ['item_id' => $tepung->id, 'quantity' => 5],
                    ['item_id' => $gula->id, 'quantity' => 0.5],
                    ['item_id' => $telur->id, 'quantity' => 2],
                    ['item_id' => $mentega->id, 'quantity' => 0.3],
                    ['item_id' => $ragi->id, 'quantity' => 0.01],
                ],
            ],
            [
                'name' => 'Kue Cokelat Chip',
                'description' => 'Kue kering cokelat chip renyah',
                'items' => [
                    ['item_id' => $tepung->id, 'quantity' => 2],
                    ['item_id' => $gulaHalus->id, 'quantity' => 1],
                    ['item_id' => $mentega->id, 'quantity' => 0.5],
                    ['item_id' => $telur->id, 'quantity' => 1],
                    ['item_id' => $cokelat->id, 'quantity' => 0.3],
                ],
            ],
            [
                'name' => 'Donat Cokelat',
                'description' => 'Donat lembut dengan topping cokelat',
                'items' => [
                    ['item_id' => $tepung->id, 'quantity' => 3],
                    ['item_id' => $gula->id, 'quantity' => 0.5],
                    ['item_id' => $telur->id, 'quantity' => 2],
                    ['item_id' => $mentega->id, 'quantity' => 0.2],
                    ['item_id' => $susu->id, 'quantity' => 0.5],
                    ['item_id' => $ragi->id, 'quantity' => 0.01],
                    ['item_id' => $cokelat->id, 'quantity' => 0.5],
                ],
            ],
            [
                'name' => 'Cheese Cake',
                'description' => 'Kue keju lembut dengan base biskuit',
                'items' => [
                    ['item_id' => $keju->id, 'quantity' => 1],
                    ['item_id' => $susu->id, 'quantity' => 0.5],
                    ['item_id' => $telur->id, 'quantity' => 3],
                    ['item_id' => $gulaHalus->id, 'quantity' => 0.5],
                    ['item_id' => $mentega->id, 'quantity' => 0.2],
                ],
            ],
            [
                'name' => 'Croissant Butter',
                'description' => 'Croissant butter renyah dan berlapis',
                'items' => [
                    ['item_id' => $tepung->id, 'quantity' => 4],
                    ['item_id' => $mentega->id, 'quantity' => 1.5],
                    ['item_id' => $telur->id, 'quantity' => 1],
                    ['item_id' => $gula->id, 'quantity' => 0.3],
                    ['item_id' => $ragi->id, 'quantity' => 0.01],
                ],
            ],
        ];

        foreach ($recipes as $recipe) {
            $items = $recipe['items'];
            unset($recipe['items']);

            $r = Recipe::create($recipe);

            foreach ($items as $item) {
                $r->items()->create($item);
            }
        }
    }
}
