<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductionLogItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'production_log_id' => $this->production_log_id,
            'item_id' => $this->item_id,
            'quantity_used' => (float) $this->quantity_used,
            'item' => new ItemResource($this->whenLoaded('item')),
        ];
    }
}
