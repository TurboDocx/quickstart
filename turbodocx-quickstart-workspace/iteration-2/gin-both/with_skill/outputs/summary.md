# TurboDocx Integration Summary

## Files Created

- `.env` — Environment variables for TurboSign and TurboPartner (placeholder values)
- `.env.example` — Example env file with placeholder values for documentation
- `.gitignore` — Excludes `.env` from version control
- `internal/config/turbodocx.go` — TurboSign and TurboPartner client initialization
- `internal/handlers/turbosign.go` — Gin handlers for `POST /api/signatures/send` and `GET /api/signatures/:id/status`
- `internal/handlers/turbopartner.go` — Gin handlers for `POST /api/organizations` and `GET /api/organizations`

## Files Modified

- `go.mod` — Added `github.com/turbodocx/sdk` and `github.com/joho/godotenv` dependencies
- `main.go` — Added godotenv loading, TurboDocx client initialization, and route registration under `/api`

## Packages to Install

```bash
go get github.com/turbodocx/sdk
go get github.com/joho/godotenv
```

## Environment Variables (update in .env)

- `TURBODOCX_API_KEY` — API key from TurboDocx dashboard
- `TURBODOCX_ORG_ID` — Organization UUID from dashboard
- `TURBODOCX_SENDER_EMAIL` — Verified reply-to email for signature requests
- `TURBODOCX_SENDER_NAME` — Display name on signature emails
- `TURBODOCX_PARTNER_API_KEY` — Partner API key (must start with `TDXP-`)
- `TURBODOCX_PARTNER_ID` — Partner UUID from partner dashboard

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/signatures/send` | Send a document for e-signature |
| GET | `/api/signatures/:id/status` | Check signature request status |
| POST | `/api/organizations` | Provision a new customer organization |
| GET | `/api/organizations` | List managed organizations |

## Quick Test

```bash
# Send a document for signature
curl -X POST http://localhost:8080/api/signatures/send \
  -F "file=@contract.pdf" \
  -F "document_name=Partnership Agreement" \
  -F 'recipients=[{"name":"John Doe","email":"john@example.com","signing_order":1}]' \
  -F 'fields=[{"type":"signature","recipient_email":"john@example.com","template":{"anchor":"{signature1}","placement":"replace","size":{"width":100,"height":30}}}]'

# List organizations
curl http://localhost:8080/api/organizations
```

## Next Steps

1. Get your API credentials at https://app.turbodocx.com
2. Update `.env` with your real credentials
3. Run `go get github.com/turbodocx/sdk github.com/joho/godotenv` to install dependencies
4. Start your server with `go run main.go` and test the endpoints

Documentation: https://docs.turbodocx.com
Support: https://discord.gg/NYKwz4BcpX
