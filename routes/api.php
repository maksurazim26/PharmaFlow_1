<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout',        [AuthController::class, 'logout']);
    Route::get('/auth/me',             [AuthController::class, 'me']);
    Route::patch('/auth/profile',      [UserController::class, 'updateProfile']);

    // Read access — all authenticated roles
    Route::get('/depots/hierarchy',    [DepotController::class, 'hierarchy']);
    Route::get('/depots',              [DepotController::class, 'index']);
    Route::get('/depots/{depot}',      [DepotController::class, 'show']);
    Route::get('/medicines',           [MedicineController::class, 'index']);
    Route::get('/medicines/{medicine}',[MedicineController::class, 'show']);
    Route::get('/suppliers',           [SupplierController::class, 'index']);
    Route::get('/inventory',           [InventoryController::class, 'index']);
    Route::get('/inventory/summary',   [InventoryController::class, 'summary']);
    Route::get('/inventory/expiring',  [InventoryController::class, 'expiring']);
    Route::get('/transfers',           [TransferController::class, 'index']);
    Route::get('/transfers/{transfer}',[TransferController::class, 'show']);
    Route::get('/alerts',              [AlertController::class, 'index']);
    Route::get('/alerts/stats',        [AlertController::class, 'stats']);

    // Write access — super_admin, hub_admin, depot_manager only (NOT staff)
    Route::middleware('role:super_admin,hub_admin,depot_manager')->group(function () {
        Route::post('/depots',                 [DepotController::class, 'store']);
        Route::put('/depots/{depot}',          [DepotController::class, 'update']);
        Route::patch('/depots/{depot}',        [DepotController::class, 'update']);
        Route::delete('/depots/{depot}',       [DepotController::class, 'destroy']);

        Route::post('/medicines',              [MedicineController::class, 'store']);
        Route::put('/medicines/{medicine}',    [MedicineController::class, 'update']);
        Route::patch('/medicines/{medicine}',  [MedicineController::class, 'update']);
        Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy']);

        Route::post('/suppliers',                [SupplierController::class, 'store']);
        Route::put('/suppliers/{supplier}',      [SupplierController::class, 'update']);
        Route::patch('/suppliers/{supplier}',    [SupplierController::class, 'update']);
        Route::delete('/suppliers/{supplier}',   [SupplierController::class, 'destroy']);

        Route::post('/inventory/receive',      [InventoryController::class, 'receive']);
        Route::patch('/inventory/batches/{batch}/flag', [InventoryController::class, 'flagBatch']);

        Route::post('/transfers',              [TransferController::class, 'store']);
        Route::patch('/transfers/{transfer}/status', [TransferController::class, 'updateStatus']);

        Route::patch('/alerts/{alert}/resolve', [AlertController::class, 'resolve']);
    });

    // Super admin only — user management
    Route::middleware('role:super_admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
    });
});