<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $fillable = ['medicine_id','depot_id','batch_id','type','severity','message','is_resolved','resolved_by','resolved_at','xmpp_sent','email_sent'];

    protected $casts = [
        'is_resolved' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    public function medicine() {
        return $this->belongsTo(Medicine::class);
    }
    public function depot() {
        return $this->belongsTo(Depot::class);
    }
    public function batch() {
        return $this->belongsTo(Batch::class);
    }
    public function resolvedBy() {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}