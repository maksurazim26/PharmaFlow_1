<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['name','contact_person','email','phone','address','lead_time_days','is_active'];

    public function medicines() {
        return $this->hasMany(Medicine::class);
    }
}