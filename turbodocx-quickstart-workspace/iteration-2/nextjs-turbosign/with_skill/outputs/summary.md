# TurboDocx TurboSign Integration — Summary

## Project Details

- **Language:** TypeScript
- **Framework:** Next.js 14 (App Router)
- **Package Manager:** npm (no lockfile detected)

## Created Files

| File | Description |
|------|-------------|
| `lib/turbodocx.ts` | TurboSign client configuration — imports and configures the SDK using environment variables, exports the `TurboSign` instance |
| `app/api/signatures/send/route.ts` | `POST /api/signatures/send` — accepts multipart form upload (PDF file, recipients, fields) and sends the document for e-signature |
| `app/api/signatures/[id]/status/route.ts` | `GET /api/signatures/:id/status` — returns signing status and per-recipient details for a document |
| `.env.local` | Environment variables with placeholder values for TurboSign |
| `.env.example` | Environment variable template for documentation/sharing |
| `.gitignore` | Standard Next.js gitignore with `.env` files excluded |

## Modified Files

| File | Change |
|------|--------|
| `package.json` | Added `@turbodocx/sdk` dependency |

## Package to Install

```bash
npm install @turbodocx/sdk
```

(Not executed per instructions — run manually.)

## Environment Variables (update in `.env.local`)

| Variable | Description |
|----------|-------------|
| `TURBODOCX_API_KEY` | API key from your TurboDocx dashboard |
| `TURBODOCX_ORG_ID` | Organization UUID from your dashboard |
| `TURBODOCX_SENDER_EMAIL` | Verified reply-to email for signature emails |
| `TURBODOCX_SENDER_NAME` | Display name on signature emails (optional) |

## Quick Test

```bash
# Send a document for signature
curl -X POST http://localhost:3000/api/signatures/send \
  -F "file=@contract.pdf" \
  -F "documentName=Partnership Agreement" \
  -F 'recipients=[{"name":"John Doe","email":"john@example.com","signingOrder":1}]' \
  -F 'fields=[{"type":"signature","recipientEmail":"john@example.com","template":{"anchor":"{signature1}","placement":"replace","size":{"width":100,"height":30}}}]'

# Check document status
curl http://localhost:3000/api/signatures/DOCUMENT_ID_HERE/status
```

## Next Steps

1. Get your API credentials at https://app.turbodocx.com
2. Update `.env.local` with your real credentials
3. Run `npm install` to install dependencies
4. Run `npm run dev` and test the endpoints

## Documentation

- Docs: https://docs.turbodocx.com
- Support: https://discord.gg/NYKwz4BcpX
