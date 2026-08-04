<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained('medicines')->onDelete('cascade');
            $table->foreignId('depot_id')->constrained('depots')->onDelete('cascade');
            $table->string('lot_number')->unique();
            $table->integer('quantity');
            $table->integer('quantity_available');
            $table->decimal('cost_per_unit', 10, 2);
            $table->date('manufacture_date')->nullable();
            $table->date('expiry_date');
            $table->enum('status', ['active', 'near_expiry', 'expired', 'flagged', 'disposed'])->default('active');
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['depot_id', 'medicine_id']);
            $table->index('expiry_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};