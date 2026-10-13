<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'purchase_order_id' => $this->purchase_order_id,
            'item_id' => $this->item_id,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'subtotal' => $this->quantity * $this->unit_price,
            'item' => new ItemResource($this->whenLoaded('item')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
