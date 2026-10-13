<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecipeItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'item' => new ItemResource($this->whenLoaded('item')),
            'quantity' => $this->quantity,
            'subtotal' => $this->when(
                $request->user()?->isSuperAdmin(),
                $this->quantity * ($this->item->cost_price ?? 0)
            ),
        ];
    }
}
