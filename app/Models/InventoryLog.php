<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class InventoryLog extends Model
{
    protected $fillable = ['batch_id','depot_id','medicine_id','user_id','action','quantity_change','quantity_after','note'];

    public function batch() {
        return $this->belongsTo(Batch::class);
    }
    public function depot() {
        return $this->belongsTo(Depot::class);
    }
    public function medicine() {
        return $this->belongsTo(Medicine::class);
    }
    public function user() {
        return $this->belongsTo(User::class);
    }
}