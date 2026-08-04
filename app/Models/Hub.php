<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Hub extends Model
{
    protected $fillable = ['name','region','address','contact_person','contact_phone','is_active'];

    public function depots() {
        return $this->hasMany(Depot::class);
    }
}