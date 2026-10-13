<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'data' => $this->data,
            'is_read' => $this->read_at !== null,
            'read_at' => $this->read_at?->format('Y-m-d H:i'),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
        ];
    }
}
