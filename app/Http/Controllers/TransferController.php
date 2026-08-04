<?php
namespace App\Http\Controllers;

use App\Models\Transfer;
use App\Models\TransferLog;
use App\Models\Batch;
use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        $query = Transfer::with(['fromDepot', 'toDepot', 'medicine', 'requestedBy']);
        if ($request->status) $query->where('status', $request->status);
        if ($request->depot_id) {
            $query->where(fn($q) => $q->where('from_depot_id', $request->depot_id)
                                       ->orWhere('to_depot_id', $request->depot_id));
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function show(Transfer $transfer)
    {
        return response()->json($transfer->load(['fromDepot', 'toDepot', 'medicine', 'batch', 'requestedBy', 'approvedBy', 'logs']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'from_depot_id' => 'required|exists:depots,id',
            'to_depot_id' => 'required|exists:depots,id|different:from_depot_id',
            'medicine_id' => 'required|exists:medicines,id',
            'batch_id' => 'required|exists:batches,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $batch = Batch::findOrFail($data['batch_id']);
            abort_if($batch->quantity_available < $data['quantity'], 422, "Insufficient stock. Available: {$batch->quantity_available}");

            $transfer = Transfer::create(array_merge($data, [
                'status' => 'requested',
                'requested_by' => $request->user()->id,
            ]));

            TransferLog::create([
                'transfer_id' => $transfer->id,
                'changed_by' => $request->user()->id,
                'from_status' => 'new',
                'to_status' => 'requested',
                'note' => 'Transfer created',
            ]);

            return response()->json($transfer->load(['fromDepot', 'toDepot', 'medicine']), 201);
        });
    }

    public function updateStatus(Request $request, Transfer $transfer)
    {
        $data = $request->validate(['status' => 'required|string', 'note' => 'nullable|string']);

        $allowed = [
            'requested' => ['approved', 'rejected'],
            'approved' => ['dispatched', 'rejected'],
            'dispatched' => ['in_transit', 'delayed'],
            'in_transit' => ['received', 'delayed'],
            'delayed' => ['received'],
        ];

        abort_unless(in_array($data['status'], $allowed[$transfer->status] ?? []), 422, "Cannot transition from {$transfer->status} to {$data['status']}");

        return DB::transaction(function () use ($transfer, $data, $request) {
            $old = $transfer->status;
            $update = ['status' => $data['status']];

            if ($data['status'] === 'approved') $update['approved_by'] = $request->user()->id;
            if ($data['status'] === 'dispatched') {
                $update['dispatched_by'] = $request->user()->id;
                $update['dispatched_at'] = now();
                $update['expected_arrival'] = now()->addDays(2);
            }
            if ($data['status'] === 'received') {
                $update['received_by'] = $request->user()->id;
                $update['received_at'] = now();
            }

            $transfer->update($update);

            TransferLog::create([
                'transfer_id' => $transfer->id,
                'changed_by' => $request->user()->id,
                'from_status' => $old,
                'to_status' => $data['status'],
                'note' => $data['note'] ?? null,
            ]);

            if ($data['status'] === 'dispatched') {
                $transfer->batch->decrement('quantity_available', $transfer->quantity);
                InventoryLog::create([
                    'batch_id' => $transfer->batch_id,
                    'depot_id' => $transfer->from_depot_id,
                    'medicine_id' => $transfer->medicine_id,
                    'user_id' => $request->user()->id,
                    'action' => 'transferred_out',
                    'quantity_change' => -$transfer->quantity,
                    'quantity_after' => $transfer->batch->fresh()->quantity_available,
                    'note' => "Transfer #{$transfer->id}",
                ]);
            }

            if ($data['status'] === 'received') {
                $src = $transfer->batch;
                $nb = Batch::create([
                    'medicine_id' => $transfer->medicine_id,
                    'depot_id' => $transfer->to_depot_id,
                    'lot_number' => $src->lot_number . '-T' . $transfer->id,
                    'quantity' => $transfer->quantity,
                    'quantity_available' => $transfer->quantity,
                    'cost_per_unit' => $src->cost_per_unit,
                    'expiry_date' => $src->expiry_date,
                    'manufacture_date' => $src->manufacture_date,
                    'received_by' => $request->user()->id,
                ]);

                InventoryLog::create([
                    'batch_id' => $nb->id,
                    'depot_id' => $transfer->to_depot_id,
                    'medicine_id' => $transfer->medicine_id,
                    'user_id' => $request->user()->id,
                    'action' => 'transferred_in',
                    'quantity_change' => $transfer->quantity,
                    'quantity_after' => $transfer->quantity,
                    'note' => "Transfer #{$transfer->id}",
                ]);
            }

            return response()->json($transfer->fresh()->load(['fromDepot', 'toDepot', 'medicine', 'logs']));
        });
    }

    public function destroy(Transfer $transfer)
    {
        return response()->json(['message' => 'Not allowed'], 403);
    }
}