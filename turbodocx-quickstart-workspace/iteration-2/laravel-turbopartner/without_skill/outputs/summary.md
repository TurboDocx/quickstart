# TurboDocx TurboPartner Integration Summary

## Package to Install

Run `composer require turbodocx/sdk` to install the TurboDocx PHP SDK (added to `composer.json` as `"turbodocx/sdk": "^1.0"`).

## Files Created

| File | Description |
|------|-------------|
| `config/services.php` | Laravel config file with TurboDocx API key, partner ID, and base URL settings |
| `app/Services/TurboPartnerService.php` | Service class wrapping the TurboDocx TurboPartner HTTP API (organizations CRUD + member management) |
| `app/Http/Controllers/OrganizationController.php` | REST controller with endpoints for creating, listing, updating, and deleting organizations and their members |
| `.env` | Environment file with placeholder TurboDocx credentials |
| `.env.example` | Example environment file for reference |

## Files Modified

| File | Change |
|------|--------|
| `composer.json` | Added `turbodocx/sdk` dependency |
| `routes/api.php` | Added organization CRUD and member management routes under `/api/organizations` |
| `app/Providers/AppServiceProvider.php` | Registered `TurboPartnerService` as a singleton in the service container |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List all organizations |
| POST | `/api/organizations` | Create a new organization |
| GET | `/api/organizations/{id}` | Get a single organization |
| PATCH | `/api/organizations/{id}` | Update an organization |
| DELETE | `/api/organizations/{id}` | Delete an organization |
| GET | `/api/organizations/{id}/members` | List organization members |
| POST | `/api/organizations/{id}/members` | Add a member to an organization |
| DELETE | `/api/organizations/{id}/members/{memberId}` | Remove a member |

## Next Steps

1. Run `composer require turbodocx/sdk` to install the SDK
2. Set `TURBODOCX_API_KEY` and `TURBODOCX_PARTNER_ID` in `.env` (get credentials from https://app.turbodocx.com/settings/api)
3. Test with `php artisan serve` and call `GET /api/organizations`
