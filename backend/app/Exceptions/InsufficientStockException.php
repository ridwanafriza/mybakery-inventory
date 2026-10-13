<?php

namespace App\Exceptions;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    /**
     * @param array $missing Daftar bahan kurang: item_id, item_name, unit, qty_needed, available, deficit
     */
    public function __construct(public readonly array $missing)
    {
        parent::__construct('Stok bahan tidak mencukupi untuk produksi');
    }

    public function detail(): string
    {
        return collect($this->missing)
            ->map(fn ($m) => "{$m['item_name']} (butuh {$m['qty_needed']}, tersedia {$m['available']})")
            ->implode('; ');
    }
}
