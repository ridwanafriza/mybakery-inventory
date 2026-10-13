<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:50', 'unique:items,barcode,' . $this->route('item')->id],
            'default_supplier_id' => ['sometimes', 'nullable', 'integer', 'exists:suppliers,id'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'threshold' => ['sometimes', 'integer', 'min:0'],
            'is_perishable' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
