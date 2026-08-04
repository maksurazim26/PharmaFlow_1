<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class TransferLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['transfer_id','changed_by','from_status','to_status','note','changed_at'];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public function transfer() {
        return $this->belongsTo(Transfer::class);
    }
    public function changedBy() {
        return $this->belongsTo(User::class, 'changed_by');
    }
}