<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->onDelete('cascade');
            $table->foreignId('depot_id')->constrained('depots')->onDelete('cascade');
            $table->foreignId('medicine_id')->constrained('medicines')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('action', [
                'received', 'dispatched', 'transferred_out',
                'transferred_in', 'disposed', 'adjusted'
            ]);
            $table->integer('quantity_change');
            $table->integer('quantity_after');
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['depot_id', 'medicine_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_logs');
    }
};