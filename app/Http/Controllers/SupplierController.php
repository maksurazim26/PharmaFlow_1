<?php
namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index() {
        return response()->json(Supplier::where('is_active', true)->get());
    }

    public function store(Request $request) {
        $data = $request->validate([
            'name' => 'required',
            'contact_person' => 'nullable',
            'email' => 'nullable|email',
            'phone' => 'nullable',
            'address' => 'nullable',
            'lead_time_days' => 'required|integer',
        ]);
        return response()->json(Supplier::create($data), 201);
    }

    public function update(Request $request, Supplier $supplier) {
        $supplier->update($request->all());
        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier) {
        $supplier->update(['is_active' => false]);
        return response()->json(['message' => 'Deactivated']);
    }
}