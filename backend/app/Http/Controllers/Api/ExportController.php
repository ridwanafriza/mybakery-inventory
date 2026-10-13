<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ExportController extends Controller
{
    public function dashboard(Request $request): Response
    {
        $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = StockMovement::with(['item', 'branch', 'user'])
            ->orderByDesc('created_at');

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id));
        }

        $query->when($request->start_date, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));

        $movements = $query->get();

        $rows = [['Tanggal', 'Cabang', 'Item', 'Tipe', 'Jumlah', 'Satuan', 'Catatan', 'User']];
        foreach ($movements as $m) {
            $rows[] = [
                $m->created_at->format('Y-m-d H:i'),
                $m->branch?->name ?? '',
                $m->item?->name ?? '',
                $m->type === 'in' ? 'Masuk' : 'Keluar',
                $m->quantity,
                $m->item?->unit ?? '',
                $m->note ?? '',
                $m->user?->name ?? '',
            ];
        }

        return $this->csvResponse($rows, 'dashboard-export.csv');
    }

    public function stockMovements(Request $request): Response
    {
        $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'type' => 'nullable|in,in,out',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $query = StockMovement::with(['item', 'branch', 'user'])
            ->orderByDesc('created_at');

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id));
        }

        $query->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->from_date, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to_date, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));

        $movements = $query->get();

        $rows = [['Tanggal', 'Cabang', 'Item', 'Tipe', 'Jumlah', 'Satuan', 'Catatan', 'User']];
        foreach ($movements as $m) {
            $rows[] = [
                $m->created_at->format('Y-m-d H:i'),
                $m->branch?->name ?? '',
                $m->item?->name ?? '',
                $m->type === 'in' ? 'Masuk' : 'Keluar',
                $m->quantity,
                $m->item?->unit ?? '',
                $m->note ?? '',
                $m->user?->name ?? '',
            ];
        }

        return $this->csvResponse($rows, 'stock-movements-export.csv');
    }

    public function lossReport(Request $request): Response
    {
        $request->validate([
            'branch_id' => 'nullable|integer|exists:branches,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = StockMovement::with(['item', 'branch'])
            ->where('type', 'out')
            ->whereIn('reason', ['expired', 'damaged']);

        if (!$request->user()->isSuperAdmin()) {
            $query->where('branch_id', $request->user()->branch_id);
        } else {
            $query->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id));
        }

        $query->when($request->start_date, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));

        $movements = $query->get();

        $grouped = $movements->groupBy('item_id')->map(function ($items) {
            $item = $items->first()->item;
            $totalQty = $items->sum('quantity');
            $totalLoss = $items->sum(fn ($m) => $m->quantity * ($m->item->cost_price ?? 0));
            return [
                'item_name' => $item->name,
                'unit' => $item->unit,
                'cost_price' => $item->cost_price ?? 0,
                'total_quantity' => $totalQty,
                'total_loss' => $totalLoss,
                'movements_count' => $items->count(),
            ];
        })->values();

        $grandTotal = $grouped->sum('total_loss');

        $rows = [['Item', 'Satuan', 'Harga Satuan', 'Total Qty', 'Total Kerugian', 'Jumlah Transaksi']];
        foreach ($grouped as $g) {
            $rows[] = [
                $g['item_name'],
                $g['unit'],
                $g['cost_price'],
                $g['total_quantity'],
                $g['total_loss'],
                $g['movements_count'],
            ];
        }
        $rows[] = ['', '', '', '', 'TOTAL', $grandTotal];

        return $this->csvResponse($rows, 'loss-report-export.csv');
    }

    public function hpp(Request $request): Response
    {
        $recipes = Recipe::with('items.item')->orderBy('name')->get();

        $rows = [['Resep', 'Deskripsi', 'Jumlah Bahan', 'Total HPP']];
        foreach ($recipes as $recipe) {
            $rows[] = [
                $recipe->name,
                $recipe->description ?? '',
                $recipe->items->count(),
                $recipe->hpp,
            ];
        }

        return $this->csvResponse($rows, 'hpp-export.csv');
    }

    private function csvResponse(array $rows, string $filename): Response
    {
        $handle = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
