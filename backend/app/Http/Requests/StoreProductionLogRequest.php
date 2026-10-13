<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductionLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin() || $this->user()->isStaff();
    }

    public function rules(): array
    {
        return [
            'recipe_id' => ['required', 'integer', 'exists:recipes,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'produced_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.min' => 'Jumlah produksi minimal 1 batch.',
            'produced_at.required' => 'Tanggal produksi wajib diisi.',
        ];
    }
}
