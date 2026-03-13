# TurboDocx SDK Integration Summary (TurboSign + TurboPartner)

## Files Created

1. **`internal/config/config.go`** — Configuration loader that reads TurboDocx API key, base URL, webhook secrets for both TurboSign and TurboPartner, and server port from environment variables.

2. **`internal/handlers/turbosign.go`** — Gin handler for TurboSign operations: create, get, and list signature requests, plus webhook verification and event handling.

3. **`internal/handlers/turbopartner.go`** — Gin handler for TurboPartner operations: create, get, and list partner organizations, create users within organizations, plus webhook verification and event handling.

4. **`.env`** — Environment variables file with placeholder values for local development.

5. **`.env.example`** — Template environment file for documentation/onboarding.

## Files Modified

1. **`go.mod`** — Added `github.com/turbodocx/sdk-go v1.0.0` and `github.com/joho/godotenv v1.5.1` dependencies.

2. **`main.go`** — Rewired to initialize the TurboDocx SDK client, load configuration from `.env`, and register route groups for both TurboSign (`/turbosign/*`) and TurboPartner (`/turbopartner/*`). The original `/health` endpoint is preserved.

## Packages to Install

Run the following to fetch dependencies:

```bash
go get github.com/turbodocx/sdk-go@v1.0.0
go get github.com/joho/godotenv@v1.5.1
```

## API Routes Added

### TurboSign
| Method | Path | Description |
|--------|------|-------------|
| POST | `/turbosign/signature-requests` | Create a signature request |
| GET | `/turbosign/signature-requests/:id` | Get a signature request |
| GET | `/turbosign/signature-requests` | List all signature requests |
| POST | `/turbosign/webhooks` | Receive TurboSign webhook events |

### TurboPartner
| Method | Path | Description |
|--------|------|-------------|
| POST | `/turbopartner/organizations` | Create a partner organization |
| GET | `/turbopartner/organizations/:id` | Get a partner organization |
| GET | `/turbopartner/organizations` | List all partner organizations |
| POST | `/turbopartner/organizations/:id/users` | Create a user in an organization |
| POST | `/turbopartner/webhooks` | Receive TurboPartner webhook events |

## Next Steps

1. Set your `TURBODOCX_API_KEY` in `.env` (get it from https://app.turbodocx.com).
2. Configure webhook secrets if using webhooks.
3. Run `go mod tidy` to resolve the full dependency tree.
4. Fill in the `TODO` placeholders in the webhook handlers with your business logic.
