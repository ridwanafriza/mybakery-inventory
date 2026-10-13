<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_id' => ['required', 'integer', 'exists:items,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'type' => ['required', 'string', 'in:in,out'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:500'],
            'reason' => ['nullable', 'string', 'in:expired,damaged,return,transfer,opname,other'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:today'],
            'storage_location' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
