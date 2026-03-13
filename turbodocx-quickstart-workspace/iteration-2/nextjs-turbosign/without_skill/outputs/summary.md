# TurboSign Integration Summary

## Package to Install

```bash
npm install @turbodocx/sdk
```

## Files Created

| File | Description |
|------|-------------|
| `.env.example` | Template for required environment variables |
| `.env.local` | Local environment config (fill in your real values) |
| `lib/turbosign.ts` | TurboSign wrapper — configures SDK from env vars, exports `sendForSignature()` and `getDocumentStatus()` |
| `app/api/turbosign/send/route.ts` | `POST /api/turbosign/send` — accepts PDF URL + recipients + fields, sends document for e-signature |
| `app/api/turbosign/status/[documentId]/route.ts` | `GET /api/turbosign/status/:documentId` — returns current signing status of a document |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `@turbodocx/sdk` dependency |
| `app/layout.tsx` | Updated title and description for TurboSign |
| `app/page.tsx` | Replaced with interactive form to send documents and check status |

## Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `TURBODOCX_API_KEY` | Yes | API key from https://app.turbodocx.com |
| `TURBODOCX_ORG_ID` | Yes | Your organization ID |
| `TURBODOCX_SENDER_EMAIL` | Yes | Reply-to email for signature request emails |
| `TURBODOCX_SENDER_NAME` | No | Sender display name (recommended) |
| `TURBODOCX_BASE_URL` | No | API base URL (defaults to https://api.turbodocx.com) |

## API Endpoints

### `POST /api/turbosign/send`

Send a document for e-signature.

**Request body:**
```json
{
  "fileLink": "https://example.com/contract.pdf",
  "recipients": [
    { "name": "Jane Doe", "email": "jane@example.com", "signingOrder": 1 }
  ],
  "fields": [
    { "type": "signature", "page": 1, "x": 100, "y": 500, "width": 200, "height": 50, "recipientEmail": "jane@example.com" }
  ],
  "documentName": "Contract Agreement"
}
```

**Response:** `{ "success": true, "documentId": "...", "message": "..." }`

### `GET /api/turbosign/status/:documentId`

Check signing status of a document.

**Response:** `{ "status": "sent" | "completed" | "voided" | ... }`

## Getting Started

1. Fill in your credentials in `.env.local`
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000 to send a document and check its status
