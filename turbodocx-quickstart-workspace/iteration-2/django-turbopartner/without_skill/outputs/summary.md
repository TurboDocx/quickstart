# TurboPartner Django Integration — Summary

## Package to install

```
pip install turbodocx-sdk>=0.2.0
```

(Already added to `requirements.txt`; was not run during this session.)

## Files created

| File | Purpose |
|---|---|
| `turbopartner/__init__.py` | Makes `turbopartner` a Python package |
| `turbopartner/apps.py` | Django AppConfig — calls `TurboPartner.configure()` on startup |
| `turbopartner/client.py` | Re-exports the configured `TurboPartner` class for easy imports |
| `turbopartner/views.py` | DRF function-based views wrapping every TurboPartner SDK method |
| `turbopartner/urls.py` | URL routing for all TurboPartner endpoints |
| `.env` | Environment variables (placeholder values) |
| `.env.example` | Documented env-var template for other developers |

## Files modified

| File | Change |
|---|---|
| `requirements.txt` | Added `turbodocx-sdk>=0.2.0` |
| `myproject/settings.py` | Added `dotenv` loading, `turbopartner` app, and `TURBODOCX_*` settings |
| `myproject/urls.py` | Included `turbopartner.urls` under `api/turbopartner/` |

## API endpoints

All endpoints are prefixed with `/api/turbopartner/`.

### Organizations
- `GET    /organizations/` — list organisations
- `POST   /organizations/` — create organisation
- `GET    /organizations/<org_id>/` — get organisation details
- `PATCH  /organizations/<org_id>/` — update organisation name
- `DELETE /organizations/<org_id>/` — delete organisation
- `PATCH  /organizations/<org_id>/entitlements/` — update entitlements

### Organisation Users
- `GET    /organizations/<org_id>/users/` — list users
- `POST   /organizations/<org_id>/users/` — add user
- `PATCH  /organizations/<org_id>/users/<user_id>/` — update role
- `DELETE /organizations/<org_id>/users/<user_id>/` — remove user
- `POST   /organizations/<org_id>/users/<user_id>/resend-invitation/` — resend invite

### Organisation API Keys
- `GET    /organizations/<org_id>/apikeys/` — list keys
- `POST   /organizations/<org_id>/apikeys/` — create key
- `PATCH  /organizations/<org_id>/apikeys/<key_id>/` — update key
- `DELETE /organizations/<org_id>/apikeys/<key_id>/` — revoke key

### Partner API Keys
- `GET    /partner-apikeys/` — list partner keys
- `POST   /partner-apikeys/` — create partner key
- `PATCH  /partner-apikeys/<key_id>/` — update partner key
- `DELETE /partner-apikeys/<key_id>/` — revoke partner key

### Partner Portal Users
- `GET    /partner-users/` — list portal users
- `POST   /partner-users/` — add portal user
- `PATCH  /partner-users/<user_id>/` — update permissions
- `DELETE /partner-users/<user_id>/` — remove portal user
- `POST   /partner-users/<user_id>/resend-invitation/` — resend invite

### Audit Logs
- `GET    /audit-logs/` — query audit logs (supports filtering via query params)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TURBODOCX_PARTNER_API_KEY` | Yes | Partner API key (starts with `TDXP-`) |
| `TURBODOCX_PARTNER_ID` | Yes | Partner UUID |
| `TURBODOCX_BASE_URL` | No | Defaults to `https://api.turbodocx.com` |

## Next steps

1. Replace the placeholder values in `.env` with real credentials from https://app.turbodocx.com
2. Run `pip install -r requirements.txt`
3. Run `python manage.py runserver`
4. Test with: `curl http://localhost:8000/api/turbopartner/organizations/`
