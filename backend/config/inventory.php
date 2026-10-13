<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Inventory Prediction Constants (Fase 15)
    |--------------------------------------------------------------------------
    | Dipakai oleh StockPredictionService untuk estimasi habis & reorder point.
    | Ubah nilai di sini bila perlu menyesuaikan asumsi bisnis — jangan hardcode
    | di controller/service.
    */

    // Window hari untuk hitung rata-rata pemakaian harian (reason `production` saja)
    'prediction_window_days' => (int) env('INVENTORY_PREDICTION_WINDOW_DAYS', 30),

    // Buffer hari di atas lead time supplier sebelum reorder point aktif
    'safety_days' => (int) env('INVENTORY_SAFETY_DAYS', 3),

    'estimated_days_left' => [
        // Batas merah estimasi habis (≤ N hari)
        'critical' => (int) env('INVENTORY_ESTIMATED_CRITICAL_DAYS', 3),
        // Batas kuning estimasi habis (≤ N hari)
        'warning' => (int) env('INVENTORY_ESTIMATED_WARNING_DAYS', 7),
    ],

    // Fallback lead time (hari) kalau item tidak punya default_supplier_id
    'default_lead_time_days' => (int) env('INVENTORY_DEFAULT_LEAD_TIME_DAYS', 0),

];
