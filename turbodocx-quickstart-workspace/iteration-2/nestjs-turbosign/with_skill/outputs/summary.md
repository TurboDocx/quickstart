# TurboDocx Integration Summary

## TurboSign Integration Complete!

### Created Files
- `src/lib/turbodocx.ts` — TurboSign SDK configuration (loads env vars, exports configured client)
- `src/turbosign/turbosign.module.ts` — NestJS module for TurboSign feature
- `src/turbosign/turbosign.controller.ts` — REST endpoints for sending signatures and checking status
- `src/turbosign/turbosign.service.ts` — Business logic with SDK calls and error mapping
- `src/turbosign/dto/send-signature.dto.ts` — Request DTO for send-signature endpoint
- `.env` — Environment variables with placeholder values
- `.env.example` — Environment variable template for documentation
- `.gitignore` — Ignores node_modules, dist, and .env

### Modified Files
- `package.json` — Added `@turbodocx/sdk`, `dotenv`, `multer` to dependencies; `@types/multer` to devDependencies
- `src/main.ts` — Added `import 'dotenv/config'` at entry point to load environment variables
- `src/app.module.ts` — Imported `TurboSignModule` into the root application module

### Packages to Install
- `@turbodocx/sdk` — TurboDocx SDK
- `dotenv` — Environment variable loading
- `multer` — Multipart form-data parsing (file uploads)
- `@types/multer` — TypeScript types for multer (dev)

### Environment Variables (update in .env)
- `TURBODOCX_API_KEY` — Your API key from the TurboDocx dashboard
- `TURBODOCX_ORG_ID` — Your organization UUID
- `TURBODOCX_SENDER_EMAIL` — Verified reply-to email for signature requests
- `TURBODOCX_SENDER_NAME` — Display name on signature emails

### Endpoints

#### POST /signatures/send
Send a PDF document for e-signature. Multipart/form-data with:
- `file` — PDF file
- `documentName` — Document name string
- `recipients` — JSON string array of `{name, email, signingOrder}`
- `fields` — JSON string array of signature field definitions

#### GET /signatures/:id/status
Check signing status of a document by ID. Returns status (`pending`, `completed`, `voided`) and per-recipient details.

### Quick Test
```bash
# Send a document for signature
curl -X POST http://localhost:3000/signatures/send \
  -F "file=@contract.pdf" \
  -F "documentName=Partnership Agreement" \
  -F 'recipients=[{"name":"John Doe","email":"john@example.com","signingOrder":1}]' \
  -F 'fields=[{"type":"signature","recipientEmail":"john@example.com","template":{"anchor":"{signature1}","placement":"replace","size":{"width":100,"height":30}}}]'

# Check signature status
curl http://localhost:3000/signatures/abc123/status
```

### Next Steps
1. Run `npm install` to install dependencies
2. Get your API credentials at https://app.turbodocx.com
3. Update `.env` with your real credentials
4. Start the server with `npm run start:dev` and test the endpoints

### Documentation
- Docs: https://docs.turbodocx.com
- Support: https://discord.gg/NYKwz4BcpX
