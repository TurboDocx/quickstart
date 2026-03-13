# TurboDocx TurboPartner Integration Summary

## Files Created

- `.env` — TurboPartner environment variables (with placeholder values)
- `.env.example` — Environment variable template for documentation
- `.gitignore` — Ensures `.env` is not committed
- `myproject/turbodocx.py` — TurboPartner SDK configuration and client export
- `turbopartner/__init__.py` — Django app package init
- `turbopartner/apps.py` — Django app configuration
- `turbopartner/views.py` — API views for `create_organization` and `list_organizations`
- `turbopartner/urls.py` — URL routing for TurboPartner endpoints

## Files Modified

- `requirements.txt` — Added `turbodocx-sdk>=1.0.0`
- `manage.py` — Added `python-dotenv` loading at startup
- `myproject/wsgi.py` — Added `python-dotenv` loading at startup
- `myproject/settings.py` — Added `turbopartner` to `INSTALLED_APPS`
- `myproject/urls.py` — Wired `api/organizations/` route to turbopartner app URLs

## Installed (to be installed)

- `turbodocx-sdk>=1.0.0` (added to requirements.txt; run `pip install -r requirements.txt`)

## Environment Variables (update in .env)

- `TURBODOCX_PARTNER_API_KEY` — Must start with `TDXP-` prefix
- `TURBODOCX_PARTNER_ID` — Partner UUID from your partner dashboard

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organizations/create/` | Provision a new customer organization |
| GET | `/api/organizations/` | List managed organizations |

## Quick Test

```bash
# Create an organization
curl -X POST http://localhost:8000/api/organizations/create/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "features": {"maxUsers": 50, "hasTDAI": true}}'

# List organizations
curl http://localhost:8000/api/organizations/?page=1&limit=20
```

## Next Steps

1. Get your partner API credentials at https://app.turbodocx.com
2. Update `.env` with your real `TURBODOCX_PARTNER_API_KEY` and `TURBODOCX_PARTNER_ID`
3. Install dependencies: `pip install -r requirements.txt`
4. Start your server: `python manage.py runserver`
5. Test the endpoints with the curl commands above

## Documentation

- Docs: https://docs.turbodocx.com
- Support: https://discord.gg/NYKwz4BcpX
