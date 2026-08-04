<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $fillable = ['supplier_id','name','generic_name','category','unit','cost_per_unit','reorder_threshold','storage_condition','is_active'];

    public function supplier() {
        return $this->belongsTo(Supplier::class);
    }
    public function batches() {
        return $this->hasMany(Batch::class);
    }
}