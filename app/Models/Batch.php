<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = ['medicine_id','depot_id','lot_number','quantity','quantity_available','cost_per_unit','manufacture_date','expiry_date','status','received_by'];

    protected $casts = [
        'expiry_date' => 'date',
        'manufacture_date' => 'date',
    ];

    public function medicine() {
        return $this->belongsTo(Medicine::class);
    }
    public function depot() {
        return $this->belongsTo(Depot::class);
    }
    public function receivedBy() {
        return $this->belongsTo(User::class, 'received_by');
    }
}