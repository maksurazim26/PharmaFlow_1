<?php
namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Batch::with(['medicine', 'depot'])->whereIn('status', ['active', 'near_expiry']);
        if ($request->depot_id) $query->where('depot_id', $request->depot_id);
        if ($request->search) {
            $query->whereHas('medicine', fn($q) => $q->where('name', 'like', "%{$request->search}%"))
                  ->orWhere('lot_number', 'like', "%{$request->search}%");
        }
        return response()->json($query->orderBy('expiry_date')->paginate(20));
    }

    public function summary(Request $request)
    {
        $did = $request->depot_id;
        $q = Batch::whereIn('status', ['active', 'near_expiry']);
        if ($did) $q->where('depot_id', $did);
        $batches = $q->get();

        return response()->json([
            'total_medicines' => $batches->pluck('medicine_id')->unique()->count(),
            'total_units' => $batches->sum('quantity_available'),
            'total_value' => $batches->sum(fn($b) => $b->quantity_available * $b->cost_per_unit),
            'expiring_90' => Batch::whereIn('status', ['active', 'near_expiry'])
                ->when($did, fn($q) => $q->where('depot_id', $did))
                ->whereBetween('expiry_date', [now(), now()->addDays(90)])
                ->count(),
            'low_stock_count' => DB::table('batches')
                ->join('medicines', 'batches.medicine_id', '=', 'medicines.id')
                ->whereIn('batches.status', ['active', 'near_expiry'])
                ->when($did, fn($q) => $q->where('batches.depot_id', $did))
                ->whereRaw('batches.quantity_available <= medicines.reorder_threshold')
                ->distinct('batches.medicine_id')
                ->count('batches.medicine_id'),
        ]);
    }

    public function expiring(Request $request)
    {
        $days = $request->days ?? 90;
        $query = Batch::with(['medicine', 'depot'])
            ->whereIn('status', ['active', 'near_expiry'])
            ->whereBetween('expiry_date', [now(), now()->addDays($days)])
            ->orderBy('expiry_date');
        if ($request->depot_id) $query->where('depot_id', $request->depot_id);

        return response()->json($query->get()->map(fn($b) => array_merge(
            $b->toArray(),
            ['days_to_expiry' => now()->diffInDays($b->expiry_date, false)]
        )));
    }

    public function receive(Request $request)
    {
        $data = $request->validate([
            'medicine_id' => 'required|exists:medicines,id',
            'depot_id' => 'required|exists:depots,id',
            'lot_number' => 'required|unique:batches',
            'quantity' => 'required|integer|min:1',
            'cost_per_unit' => 'required|numeric',
            'expiry_date' => 'required|date',
            'manufacture_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $batch = Batch::create(array_merge($data, [
                'quantity_available' => $data['quantity'],
                'received_by' => $request->user()->id,
            ]));

            InventoryLog::create([
                'batch_id' => $batch->id,
                'depot_id' => $batch->depot_id,
                'medicine_id' => $batch->medicine_id,
                'user_id' => $request->user()->id,
                'action' => 'received',
                'quantity_change' => $batch->quantity,
                'quantity_after' => $batch->quantity,
                'note' => "Batch {$batch->lot_number} received",
            ]);

            return response()->json($batch->load('medicine', 'depot'), 201);
        });
    }

    public function flagBatch(Request $request, Batch $batch)
    {
        $batch->update(['status' => 'flagged']);
        return response()->json(['message' => 'Flagged', 'batch' => $batch]);
    }
}