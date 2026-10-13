<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:items,barcode'],
            'default_supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'unit' => ['required', 'string', 'max:50'],
            'threshold' => ['required', 'integer', 'min:0'],
            'is_perishable' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
