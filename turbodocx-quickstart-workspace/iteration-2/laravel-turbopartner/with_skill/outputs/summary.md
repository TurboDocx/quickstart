# TurboDocx TurboPartner Integration Summary

## Files Created

- `.env` — TurboPartner environment variables with placeholder values
- `.env.example` — Template for environment variables
- `.gitignore` — Excludes `.env` and `/vendor/` from version control
- `app/Http/Controllers/OrganizationController.php` — Controller with `create` and `index` endpoints for managing customer organizations

## Files Modified

- `composer.json` — Added `turbodocx/sdk` (`^1.0`) to `require`
- `app/Providers/AppServiceProvider.php` — Added TurboPartner SDK initialization in `boot()` method
- `routes/api.php` — Registered `POST /api/organizations` and `GET /api/organizations` routes

## Packages to Install

- `turbodocx/sdk` (via `composer require turbodocx/sdk`)

## Environment Variables to Configure

| Variable | Description |
|----------|-------------|
| `TURBODOCX_PARTNER_API_KEY` | Partner API key (must start with `TDXP-` prefix) |
| `TURBODOCX_PARTNER_ID` | Partner UUID from your partner dashboard |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/organizations` | Create a new customer organization |
| `GET` | `/api/organizations` | List managed organizations (supports `?page=` and `?limit=` query params) |

## Quick Test

```bash
# Create an organization
curl -X POST http://localhost:8000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corporation", "features": {"maxUsers": 50, "hasTDAI": true}}'

# List organizations
curl http://localhost:8000/api/organizations?page=1&limit=20
```

## Next Steps

1. Get your partner API credentials at https://app.turbodocx.com
2. Update `.env` with your real `TURBODOCX_PARTNER_API_KEY` and `TURBODOCX_PARTNER_ID`
3. Run `composer install` to install dependencies
4. Start your server and test the endpoints

## Resources

- Documentation: https://docs.turbodocx.com
- Support: https://discord.gg/NYKwz4BcpX
