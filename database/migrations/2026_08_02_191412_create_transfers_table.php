<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_depot_id')->constrained('depots')->onDelete('cascade');
            $table->foreignId('to_depot_id')->constrained('depots')->onDelete('cascade');
            $table->foreignId('medicine_id')->constrained('medicines')->onDelete('cascade');
            $table->foreignId('batch_id')->constrained('batches')->onDelete('cascade');
            $table->integer('quantity');
            $table->enum('status', [
                'requested', 'approved', 'rejected',
                'dispatched', 'in_transit', 'received', 'delayed'
            ])->default('requested');
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('dispatched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('expected_arrival')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
            $table->index('status');
            $table->index(['from_depot_id', 'to_depot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};