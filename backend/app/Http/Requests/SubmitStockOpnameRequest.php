<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitStockOpnameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin() || $this->user()->isStaff();
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:stock_opname_items,id'],
            'items.*.qty_fisik' => ['required', 'numeric', 'min:0'],
        ];
    }
}
