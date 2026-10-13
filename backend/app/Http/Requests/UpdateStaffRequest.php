<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            'position' => ['nullable', 'string', 'max:255'],
            'hire_date' => ['nullable', 'date'],
            'phone' => ['nullable', 'string', 'max:50'],
        ];
    }
}
