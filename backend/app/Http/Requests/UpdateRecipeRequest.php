<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.item_id' => ['required_with:items', 'integer', 'exists:items,id'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
        ];
    }
}
