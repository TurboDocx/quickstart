# TurboSign Integration Summary

## Files Created

- `src/turbosign/turbosign.module.ts` — NestJS module that bundles the TurboSign controller and service
- `src/turbosign/turbosign.controller.ts` — Exposes two endpoints:
  - `POST /turbosign/send` — Send a document for digital signature
  - `GET /turbosign/status/:id` — Check signature status of a request
- `src/turbosign/turbosign.service.ts` — Service that calls the TurboDocx TurboSign REST API using `fetch`
- `src/turbosign/dto/send-for-signing.dto.ts` — DTO classes for the send-for-signing request body
- `.env.example` — Template for required environment variables

## Files Modified

- `src/app.module.ts` — Added `TurboSignModule` to the imports array

## Environment Variables Required

| Variable | Description | Default |
|---|---|---|
| `TURBODOCX_API_KEY` | Your TurboDocx API key | *(none — required)* |
| `TURBODOCX_BASE_URL` | TurboDocx API base URL | `https://api.turbodocx.com` |

## Packages to Install

No additional npm packages are required. The service uses the built-in `fetch` API (available in Node 18+).

## Endpoints

### Send Document for Signing

```
POST /turbosign/send
Content-Type: application/json

{
  "documentId": "doc_abc123",
  "documentName": "Contract.pdf",
  "message": "Please sign this contract",
  "signers": [
    { "name": "Jane Doe", "email": "jane@example.com" }
  ]
}
```

### Check Signature Status

```
GET /turbosign/status/:signatureRequestId
```
