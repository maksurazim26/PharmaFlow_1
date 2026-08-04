<?php
namespace App\Http\Controllers;

use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $query = Alert::with(['medicine', 'depot'])->where('is_resolved', false)->latest();
        if ($request->depot_id) $query->where('depot_id', $request->depot_id);
        if ($request->type) $query->where('type', $request->type);
        return response()->json($query->paginate(30));
    }

    public function stats(Request $request)
    {
        $q = Alert::where('is_resolved', false);
        if ($request->depot_id) $q->where('depot_id', $request->depot_id);

        return response()->json([
            'total' => (clone $q)->count(),
            'critical' => (clone $q)->where('severity', 'critical')->count(),
            'low_stock' => (clone $q)->where('type', 'low_stock')->count(),
            'near_expiry' => (clone $q)->where('type', 'near_expiry')->count(),
            'expired' => (clone $q)->where('type', 'expired')->count(),
        ]);
    }

    public function resolve(Request $request, Alert $alert)
    {
        $alert->update([
            'is_resolved' => true,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);
        return response()->json(['message' => 'Resolved', 'alert' => $alert]);
    }
}