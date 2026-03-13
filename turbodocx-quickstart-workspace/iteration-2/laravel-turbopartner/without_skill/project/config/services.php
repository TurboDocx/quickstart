<?php

return [

    /*
    |--------------------------------------------------------------------------
    | TurboDocx TurboPartner Configuration
    |--------------------------------------------------------------------------
    |
    | API credentials and base URL for the TurboDocx TurboPartner API.
    | TurboPartner lets you create and manage customer organizations
    | programmatically via the TurboDocx platform.
    |
    */

    'turbodocx' => [
        'api_key' => env('TURBODOCX_API_KEY'),
        'partner_id' => env('TURBODOCX_PARTNER_ID'),
        'base_url' => env('TURBODOCX_BASE_URL', 'https://api.turbodocx.com'),
    ],

];
