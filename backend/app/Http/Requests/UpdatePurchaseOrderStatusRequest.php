<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isBranchAdmin();
    }

    public function rules(): array
    {
        $purchaseOrder = $this->route('purchaseOrder');

        $validTransitions = match ($purchaseOrder?->status) {
            'draft' => ['sent', 'draft'],
            'sent' => ['received'],
            default => [],
        };

        return [
            'status' => ['required', 'in:' . implode(',', $validTransitions)],
        ];
    }
}
