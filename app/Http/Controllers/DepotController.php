<?php
namespace App\Http\Controllers;

use App\Models\Depot;
use App\Models\Hub;
use Illuminate\Http\Request;

class DepotController extends Controller
{
    public function index()
    {
        return response()->json(Depot::with('hub')->where('is_active', true)->get());
    }

    public function show(Depot $depot)
    {
        return response()->json($depot->load('hub'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'hub_id' => 'required|exists:hubs,id',
            'name' => 'required',
            'district' => 'required',
            'capacity' => 'required|integer',
        ]);
        return response()->json(Depot::create($data)->load('hub'), 201);
    }

    public function update(Request $request, Depot $depot)
    {
        $depot->update($request->validate([
            'name' => 'sometimes',
            'district' => 'sometimes',
            'capacity' => 'sometimes|integer',
        ]));
        return response()->json($depot);
    }

    public function destroy(Depot $depot)
    {
        $depot->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function hierarchy()
    {
        return response()->json(Hub::with(['depots' => fn($q) => $q->where('is_active', true)])->get());
    }
}