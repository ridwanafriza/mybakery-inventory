<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StockTransferResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'from_branch_id' => $this->from_branch_id,
            'to_branch_id' => $this->to_branch_id,
            'user_id' => $this->user_id,
            'approved_by' => $this->approved_by,
            'status' => $this->status,
            'notes' => $this->notes,
            'from_branch' => new BranchResource($this->whenLoaded('fromBranch')),
            'to_branch' => new BranchResource($this->whenLoaded('toBranch')),
            'user' => new UserResource($this->whenLoaded('user')),
            'approver' => new UserResource($this->whenLoaded('approver')),
            'items' => StockTransferItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i'),
        ];
    }
}
