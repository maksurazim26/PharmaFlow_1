<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained('medicines')->onDelete('cascade');
            $table->foreignId('depot_id')->constrained('depots')->onDelete('cascade');
            $table->foreignId('batch_id')->nullable()->constrained('batches')->nullOnDelete();
            $table->enum('type', ['low_stock', 'near_expiry', 'expired', 'transfer_delayed']);
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->text('message');
            $table->boolean('is_resolved')->default(false);
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->boolean('xmpp_sent')->default(false);
            $table->boolean('email_sent')->default(false);
            $table->timestamps();
            $table->index(['depot_id', 'is_resolved']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};