<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'barcode' => $this->barcode,
            'default_supplier_id' => $this->default_supplier_id,
            'category_id' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'unit' => $this->unit,
            'threshold' => $this->threshold,
            'is_perishable' => $this->is_perishable,
            'cost_price' => $this->when($request->user()?->isSuperAdmin(), $this->cost_price),
            'image' => $this->image ? asset('storage/' . $this->image) : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
