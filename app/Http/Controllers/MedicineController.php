<?php
namespace App\Http\Controllers;

use App\Models\Medicine;
use Illuminate\Http\Request;

class MedicineController extends Controller
{
    public function index()
    {
        return response()->json(Medicine::with('supplier')->where('is_active', true)->paginate(50));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required',
            'category' => 'required',
            'unit' => 'required',
            'cost_per_unit' => 'required|numeric',
            'reorder_threshold' => 'required|integer',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);
        return response()->json(Medicine::create($data), 201);
    }

    public function update(Request $request, Medicine $medicine)
    {
        $medicine->update($request->all());
        return response()->json($medicine);
    }

    public function destroy(Medicine $medicine)
    {
        $medicine->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function show(Medicine $medicine)
    {
        return response()->json($medicine->load('supplier'));
    }
}