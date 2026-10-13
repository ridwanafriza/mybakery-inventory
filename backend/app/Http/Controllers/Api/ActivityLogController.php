<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ActivityLog::with(['user'])->orderByDesc('created_at');

        if ($request->has('action') && $request->action !== '') {
            $query->where('action', $request->action);
        }

        if ($request->has('user_id') && $request->user_id !== '') {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('from_date') && $request->from_date !== '') {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date') && $request->to_date !== '') {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $logs = $query->paginate(20);

        return ActivityLogResource::collection($logs);
    }
}
