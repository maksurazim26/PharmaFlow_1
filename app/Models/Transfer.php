<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    protected $fillable = ['from_depot_id','to_depot_id','medicine_id','batch_id','quantity','status','requested_by','approved_by','dispatched_by','received_by','notes','dispatched_at','expected_arrival','received_at'];

    protected $casts = [
        'dispatched_at' => 'datetime',
        'expected_arrival' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function fromDepot() {
        return $this->belongsTo(Depot::class, 'from_depot_id');
    }
    public function toDepot() {
        return $this->belongsTo(Depot::class, 'to_depot_id');
    }
    public function medicine() {
        return $this->belongsTo(Medicine::class);
    }
    public function batch() {
        return $this->belongsTo(Batch::class);
    }
    public function requestedBy() {
        return $this->belongsTo(User::class, 'requested_by');
    }
    public function approvedBy() {
        return $this->belongsTo(User::class, 'approved_by');
    }
    public function dispatchedBy() {
        return $this->belongsTo(User::class, 'dispatched_by');
    }
    public function receivedBy() {
        return $this->belongsTo(User::class, 'received_by');
    }
    public function logs() {
        return $this->hasMany(TransferLog::class)->orderBy('changed_at');
    }
}