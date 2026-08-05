<?php
namespace Database\Seeders;

use App\Models\Hub;
use App\Models\Depot;
use App\Models\User;
use App\Models\Supplier;
use App\Models\Medicine;
use App\Models\Batch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Hubs
        $hubCentral = Hub::create(['name' => 'Central Hub', 'region' => 'Dhaka', 'address' => 'Motijheel', 'contact_person' => 'Karim Hasan', 'contact_phone' => '01700000001']);
        $hubNorth   = Hub::create(['name' => 'North Hub', 'region' => 'Rajshahi', 'address' => 'Shaheb Bazar', 'contact_person' => 'Rafiq Islam', 'contact_phone' => '01700000002']);
        $hubSouth   = Hub::create(['name' => 'South Hub', 'region' => 'Chattogram', 'address' => 'Agrabad', 'contact_person' => 'Sultana Begum', 'contact_phone' => '01700000003']);

        // Depots
        $depots = [
            Depot::create(['hub_id' => $hubCentral->id, 'name' => 'Dhaka Main Depot', 'district' => 'Dhaka', 'capacity' => 15000, 'address' => 'Motijheel Rd 1']),
            Depot::create(['hub_id' => $hubCentral->id, 'name' => 'Gazipur Depot', 'district' => 'Gazipur', 'capacity' => 8000, 'address' => 'Tongi Industrial Area']),
            Depot::create(['hub_id' => $hubNorth->id, 'name' => 'Rajshahi Depot', 'district' => 'Rajshahi', 'capacity' => 10000, 'address' => 'Shaheb Bazar Rd']),
            Depot::create(['hub_id' => $hubNorth->id, 'name' => 'Bogura Depot', 'district' => 'Bogura', 'capacity' => 6000, 'address' => 'Sherpur Road']),
            Depot::create(['hub_id' => $hubSouth->id, 'name' => 'Chattogram Depot', 'district' => 'Chattogram', 'capacity' => 12000, 'address' => 'Agrabad Commercial Area']),
            Depot::create(['hub_id' => $hubSouth->id, 'name' => 'Coxsbazar Depot', 'district' => 'Coxsbazar', 'capacity' => 5000, 'address' => 'Kolatoli Road']),
        ];

        // Admin user
        // Admin user — credentials pulled from .env, never hardcoded
User::create([
    'depot_id' => $depots[0]->id,
    'name' => env('ADMIN_NAME', 'Super Admin'),
    'email' => env('ADMIN_EMAIL', 'admin@pharmaflow.com'),
    'password' => Hash::make(env('ADMIN_PASSWORD', 'password')),
    'role' => 'super_admin',
]);

        // Extra sample users for different roles
        User::create(['depot_id' => $depots[0]->id, 'name' => 'Dhaka Manager', 'email' => 'manager@pharmaflow.com', 'password' => Hash::make('password'), 'role' => 'depot_manager']);
        User::create(['depot_id' => $depots[2]->id, 'name' => 'Rajshahi Staff', 'email' => 'staff@pharmaflow.com', 'password' => Hash::make('password'), 'role' => 'staff']);

        // Suppliers
        $supplierA = Supplier::create(['name' => 'Square Pharmaceuticals', 'contact_person' => 'Nasrin Akter', 'email' => 'contact@squarepharma.com', 'phone' => '01800000001', 'lead_time_days' => 4]);
        $supplierB = Supplier::create(['name' => 'Beximco Pharma', 'contact_person' => 'Jamal Uddin', 'email' => 'contact@beximcopharma.com', 'phone' => '01800000002', 'lead_time_days' => 6]);
        $supplierC = Supplier::create(['name' => 'Incepta Pharmaceuticals', 'contact_person' => 'Farida Yasmin', 'email' => 'contact@incepta.com', 'phone' => '01800000003', 'lead_time_days' => 5]);

        // Medicines
        $medicines = [
            Medicine::create(['supplier_id' => $supplierA->id, 'name' => 'Paracetamol 500mg', 'generic_name' => 'Paracetamol', 'category' => 'Analgesic', 'unit' => 'tablet', 'cost_per_unit' => 0.50, 'reorder_threshold' => 200]),
            Medicine::create(['supplier_id' => $supplierA->id, 'name' => 'Napa Extra', 'generic_name' => 'Paracetamol + Caffeine', 'category' => 'Analgesic', 'unit' => 'tablet', 'cost_per_unit' => 0.80, 'reorder_threshold' => 150]),
            Medicine::create(['supplier_id' => $supplierB->id, 'name' => 'Amoxicillin 250mg', 'generic_name' => 'Amoxicillin', 'category' => 'Antibiotic', 'unit' => 'capsule', 'cost_per_unit' => 2.10, 'reorder_threshold' => 100]),
            Medicine::create(['supplier_id' => $supplierB->id, 'name' => 'Ciprofloxacin 500mg', 'generic_name' => 'Ciprofloxacin', 'category' => 'Antibiotic', 'unit' => 'tablet', 'cost_per_unit' => 3.50, 'reorder_threshold' => 80]),
            Medicine::create(['supplier_id' => $supplierC->id, 'name' => 'Omeprazole 20mg', 'generic_name' => 'Omeprazole', 'category' => 'Antacid', 'unit' => 'capsule', 'cost_per_unit' => 1.20, 'reorder_threshold' => 120]),
            Medicine::create(['supplier_id' => $supplierC->id, 'name' => 'Cetirizine 10mg', 'generic_name' => 'Cetirizine', 'category' => 'Antihistamine', 'unit' => 'tablet', 'cost_per_unit' => 0.60, 'reorder_threshold' => 150]),
            Medicine::create(['supplier_id' => $supplierA->id, 'name' => 'ORSaline', 'generic_name' => 'Oral Rehydration Salt', 'category' => 'Electrolyte', 'unit' => 'sachet', 'cost_per_unit' => 0.30, 'reorder_threshold' => 300]),
            Medicine::create(['supplier_id' => $supplierB->id, 'name' => 'Metformin 500mg', 'generic_name' => 'Metformin', 'category' => 'Antidiabetic', 'unit' => 'tablet', 'cost_per_unit' => 1.00, 'reorder_threshold' => 100]),
        ];

        // Batches — spread stock across depots with varied expiry dates
        $lot = 1000;
        foreach ($depots as $depot) {
            foreach (array_slice($medicines, 0, 5) as $medicine) {
                Batch::create([
                    'medicine_id' => $medicine->id,
                    'depot_id' => $depot->id,
                    'lot_number' => 'LOT-' . $lot++,
                    'quantity' => 500,
                    'quantity_available' => rand(50, 500),
                    'cost_per_unit' => $medicine->cost_per_unit,
                    'manufacture_date' => now()->subMonths(rand(1, 6)),
                    'expiry_date' => now()->addDays(rand(15, 400)),
                    'status' => 'active',
                ]);
            }
        }

        // Generate alerts based on seeded batches (low stock + near expiry)
        Artisan::call('alerts:generate');
    }
}