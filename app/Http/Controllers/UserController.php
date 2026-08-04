<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index() {
        return response()->json(User::with('depot.hub')->get());
    }

    public function store(Request $request) {
        $data = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:super_admin,hub_admin,depot_manager,staff',
            'depot_id' => 'nullable|exists:depots,id',
            'phone' => 'nullable|string',
        ]);
        $data['password'] = Hash::make($data['password']);
        return response()->json(User::create($data)->load('depot'), 201);
    }

    public function update(Request $request, User $user) {
        $data = $request->validate([
            'name' => 'sometimes',
            'role' => 'sometimes|in:super_admin,hub_admin,depot_manager,staff',
            'depot_id' => 'nullable|exists:depots,id',
            'phone' => 'nullable|string',
            'password' => 'nullable|min:6',
        ]);
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        return response()->json($user->load('depot'));
    }

    public function destroy(Request $request, User $user) {
        abort_if($user->id === $request->user()->id, 422, "You can't delete yourself.");
        $user->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function updateProfile(Request $request) {
        $data = $request->validate([
            'name' => 'sometimes',
            'phone' => 'nullable|string',
            'password' => 'nullable|min:6',
        ]);
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $request->user()->update($data);
        return response()->json($request->user()->fresh()->load('depot'));
    }
}