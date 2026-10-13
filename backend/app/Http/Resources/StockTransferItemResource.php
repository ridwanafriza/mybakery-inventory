<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockTransferItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'stock_transfer_id' => $this->stock_transfer_id,
            'item_id' => $this->item_id,
            'quantity' => $this->quantity,
            'item' => new ItemResource($this->whenLoaded('item')),
        ];
    }
}
