<?php

use App\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['ok' => true]);
});

/*
|--------------------------------------------------------------------------
| TurboPartner Organization Management Routes
|--------------------------------------------------------------------------
|
| CRUD endpoints for managing customer organizations and their members
| via the TurboDocx TurboPartner API.
|
*/

Route::prefix('organizations')->group(function () {
    Route::get('/', [OrganizationController::class, 'index']);
    Route::post('/', [OrganizationController::class, 'store']);
    Route::get('/{id}', [OrganizationController::class, 'show']);
    Route::patch('/{id}', [OrganizationController::class, 'update']);
    Route::delete('/{id}', [OrganizationController::class, 'destroy']);

    // Organization member management
    Route::get('/{id}/members', [OrganizationController::class, 'members']);
    Route::post('/{id}/members', [OrganizationController::class, 'addMember']);
    Route::delete('/{id}/members/{memberId}', [OrganizationController::class, 'removeMember']);
});
