<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'supplier_id' => $this->supplier_id,
            'branch_id' => $this->branch_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'notes' => $this->notes,
            'total' => $this->total,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'user' => new UserResource($this->whenLoaded('user')),
            'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
