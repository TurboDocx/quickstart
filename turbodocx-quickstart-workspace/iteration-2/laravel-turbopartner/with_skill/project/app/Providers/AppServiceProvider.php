<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use TurboDocx\TurboPartner;
use TurboDocx\Config\PartnerClientConfig;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Initialize TurboPartner SDK with credentials from environment
        TurboPartner::configure(new PartnerClientConfig(
            partnerApiKey: env('TURBODOCX_PARTNER_API_KEY'),
            partnerId: env('TURBODOCX_PARTNER_ID'),
        ));
    }
}
