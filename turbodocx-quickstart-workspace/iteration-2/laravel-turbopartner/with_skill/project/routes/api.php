<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrganizationController;

Route::get('/health', function () {
    return response()->json(['ok' => true]);
});

// TurboPartner — Organization management endpoints
Route::prefix('organizations')->group(function () {
    Route::post('/', [OrganizationController::class, 'create']);
    Route::get('/', [OrganizationController::class, 'index']);
});
