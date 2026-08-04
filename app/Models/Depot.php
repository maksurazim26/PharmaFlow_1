<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Depot extends Model
{
    protected $fillable = ['hub_id','name','district','capacity','address','xmpp_jid','is_active'];

    public function hub() {
        return $this->belongsTo(Hub::class);
    }
    public function users() {
        return $this->hasMany(User::class);
    }
    public function batches() {
        return $this->hasMany(Batch::class);
    }
    public function transfersOut() {
        return $this->hasMany(Transfer::class, 'from_depot_id');
    }
    public function transfersIn() {
        return $this->hasMany(Transfer::class, 'to_depot_id');
    }
}