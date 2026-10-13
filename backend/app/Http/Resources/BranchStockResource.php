<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BranchStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'item_id' => $this->item_id,
            'quantity' => (float) $this->quantity,
            'storage_location' => $this->storage_location,
            'expiry_date' => $this->expiry_date?->format('Y-m-d'),
            'status' => $this->status,
            'item' => new ItemResource($this->whenLoaded('item')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
