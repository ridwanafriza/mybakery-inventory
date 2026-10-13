<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'item_id' => $this->item_id,
            'type' => $this->type,
            'quantity' => (float) $this->quantity,
            'note' => $this->note,
            'reason' => $this->reason,
            'user_id' => $this->user_id,
            'item' => new ItemResource($this->whenLoaded('item')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
