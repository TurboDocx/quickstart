<?php

namespace App\Providers;

use App\Services\TurboPartnerService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TurboPartnerService::class, function () {
            return new TurboPartnerService();
        });
    }

    public function boot(): void
    {
        //
    }
}
