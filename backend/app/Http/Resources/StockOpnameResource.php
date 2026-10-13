<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockOpnameResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'approved_by' => $this->approved_by,
            'notes' => $this->notes,
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'user' => new UserResource($this->whenLoaded('user')),
            'approver' => new UserResource($this->whenLoaded('approver')),
            'items' => StockOpnameItemResource::collection($this->whenLoaded('items')),
            'has_discrepancy' => $this->whenLoaded('items')->isNotEmpty() ? $this->has_discrepancy : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
