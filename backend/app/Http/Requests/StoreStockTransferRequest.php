<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'to_branch_id' => 'required|integer|exists:branches,id|different:from_branch_id',
            'from_branch_id' => 'required|integer|exists:branches,id',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:items,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ];
    }

    public function messages(): array
    {
        return [
            'to_branch_id.different' => 'Cabang tujuan harus berbeda dari cabang asal.',
            'items.required' => 'Minimal satu item harus ditambahkan.',
        ];
    }
}
