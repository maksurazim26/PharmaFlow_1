<?php

namespace App\Console\Commands;

use App\Models\Batch;
use App\Models\Alert;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateAlerts extends Command
{
    protected $signature = 'alerts:generate';
    protected $description = 'Scan inventory and generate low-stock and near-expiry alerts';

    public function handle(): void
    {
        $created = 0;

        // Near-expiry / expired batches
        $batches = Batch::with('medicine')->whereIn('status', ['active', 'near_expiry'])->get();

        foreach ($batches as $batch) {
            $daysToExpiry = now()->diffInDays($batch->expiry_date, false);

            if ($daysToExpiry < 0 && $batch->status !== 'expired') {
                $batch->update(['status' => 'expired']);
                $exists = Alert::where('batch_id', $batch->id)->where('type', 'expired')->where('is_resolved', false)->exists();
                if (!$exists) {
                    Alert::create([
                        'medicine_id' => $batch->medicine_id,
                        'depot_id' => $batch->depot_id,
                        'batch_id' => $batch->id,
                        'type' => 'expired',
                        'severity' => 'critical',
                        'message' => "{$batch->medicine->name} (Lot {$batch->lot_number}) has expired.",
                    ]);
                    $created++;
                }
            } elseif ($daysToExpiry >= 0 && $daysToExpiry <= 30) {
                if ($batch->status !== 'near_expiry') $batch->update(['status' => 'near_expiry']);
                $exists = Alert::where('batch_id', $batch->id)->where('type', 'near_expiry')->where('is_resolved', false)->exists();
                if (!$exists) {
                    Alert::create([
                        'medicine_id' => $batch->medicine_id,
                        'depot_id' => $batch->depot_id,
                        'batch_id' => $batch->id,
                        'type' => 'near_expiry',
                        'severity' => $daysToExpiry <= 7 ? 'high' : 'medium',
                        'message' => "{$batch->medicine->name} (Lot {$batch->lot_number}) expires in {$daysToExpiry} days.",
                    ]);
                    $created++;
                }
            }
        }

        // Low stock — per medicine per depot
        $lowStock = DB::table('batches')
            ->join('medicines', 'batches.medicine_id', '=', 'medicines.id')
            ->select('batches.medicine_id', 'batches.depot_id', DB::raw('SUM(batches.quantity_available) as total_available'), 'medicines.reorder_threshold', 'medicines.name')
            ->whereIn('batches.status', ['active', 'near_expiry'])
            ->groupBy('batches.medicine_id', 'batches.depot_id', 'medicines.reorder_threshold', 'medicines.name')
            ->havingRaw('SUM(batches.quantity_available) <= medicines.reorder_threshold')
            ->get();

        foreach ($lowStock as $row) {
            $exists = Alert::where('medicine_id', $row->medicine_id)->where('depot_id', $row->depot_id)->where('type', 'low_stock')->where('is_resolved', false)->exists();
            if (!$exists) {
                Alert::create([
                    'medicine_id' => $row->medicine_id,
                    'depot_id' => $row->depot_id,
                    'type' => 'low_stock',
                    'severity' => $row->total_available == 0 ? 'critical' : 'high',
                    'message' => "{$row->name} is low on stock ({$row->total_available} units left, threshold {$row->reorder_threshold}).",
                ]);
                $created++;
            }
        }

        $this->info("Generated {$created} new alerts.");
    }
}