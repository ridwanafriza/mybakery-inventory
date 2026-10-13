<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductionLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'recipe_id' => $this->recipe_id,
            'user_id' => $this->user_id,
            'quantity' => $this->quantity,
            'produced_at' => $this->produced_at?->format('Y-m-d'),
            'notes' => $this->notes,
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'recipe' => new RecipeResource($this->whenLoaded('recipe')),
            'user' => new UserResource($this->whenLoaded('user')),
            'items' => ProductionLogItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
