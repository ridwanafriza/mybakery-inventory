<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StockPredictionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockPredictionController extends Controller
{
    public function __construct(private readonly StockPredictionService $predictionService)
    {
    }

    /**
     * GET /stock-predictions — prediksi per item per cabang (scoped).
     * Query opsional: branch_id (super_admin saja).
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = null;

        if ($request->user()->isSuperAdmin()) {
            $branchId = $request->query('branch_id') !== null && $request->query('branch_id') !== ''
                ? (int) $request->query('branch_id')
                : null;
        } else {
            $branchId = $request->user()->branch_id;
        }

        $predictions = $this->predictionService->predictionsForScope($branchId, $request->user()->isSuperAdmin());

        return response()->json([
            'window_days' => $this->predictionService->windowDays(),
            'safety_days' => $this->predictionService->safetyDays(),
            'data' => $predictions,
        ]);
    }

    /**
     * GET /stock-predictions/reorder — hanya item needs_reorder = true.
     */
    public function reorderSuggestions(Request $request): JsonResponse
    {
        $branchId = null;

        if ($request->user()->isSuperAdmin()) {
            $branchId = $request->query('branch_id') !== null && $request->query('branch_id') !== ''
                ? (int) $request->query('branch_id')
                : null;
        } else {
            $branchId = $request->user()->branch_id;
        }

        $predictions = $this->predictionService->predictionsForScope($branchId, $request->user()->isSuperAdmin())
            ->filter(fn (array $p) => $p['needs_reorder'])
            ->values();

        return response()->json([
            'window_days' => $this->predictionService->windowDays(),
            'safety_days' => $this->predictionService->safetyDays(),
            'data' => $predictions,
        ]);
    }
}
