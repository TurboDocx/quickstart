# TurboDocx TurboSign Integration Summary

## Project

- **Language**: Java 17
- **Framework**: Spring Boot 3.2
- **Build Tool**: Maven
- **Base Package**: `com.example.app`

## Created Files

| File | Description |
|------|-------------|
| `src/main/java/com/example/app/config/TurboDocxConfig.java` | Spring `@Configuration` bean that initializes `TurboDocxClient` with credentials from environment variables |
| `src/main/java/com/example/app/controller/SignatureController.java` | `@RestController` with `POST /api/signatures/send` and `GET /api/signatures/{id}/status` endpoints |
| `.env` | Environment variables with placeholder values for TurboSign credentials |
| `.env.example` | Template env file for documentation (safe to commit) |
| `.gitignore` | Ignores `.env`, `target/`, and IDE files |

## Modified Files

| File | Changes |
|------|---------|
| `pom.xml` | Added `com.turbodocx:turbodocx-sdk:0.2.0` dependency |
| `src/main/resources/application.properties` | Added TurboSign env var bindings (`TURBODOCX_API_KEY`, `TURBODOCX_ORG_ID`, `TURBODOCX_SENDER_EMAIL`, `TURBODOCX_SENDER_NAME`) and multipart upload size limits (10MB) |

## Installed

- `com.turbodocx:turbodocx-sdk:0.2.0` (Maven dependency -- run `mvn install` to download)

## Environment Variables (update in .env)

| Variable | Required | Description |
|----------|----------|-------------|
| `TURBODOCX_API_KEY` | Yes | API key from your TurboDocx dashboard |
| `TURBODOCX_ORG_ID` | Yes | Organization UUID from your dashboard |
| `TURBODOCX_SENDER_EMAIL` | Yes | Reply-to email for signature emails (must be verified) |
| `TURBODOCX_SENDER_NAME` | No | Display name on signature emails |

## Endpoints

### POST /api/signatures/send

Send a document for e-signature.

**Parameters** (multipart form):
- `file` — PDF file to sign
- `documentName` — Human-readable document name
- `recipients` — JSON array, e.g. `[{"name":"John Doe","email":"john@example.com","order":1}]`
- `fields` — JSON array of signature field definitions

### GET /api/signatures/{id}/status

Check signing status by document ID.

## Quick Test

```bash
# Send a document for signing
curl -X POST http://localhost:8080/api/signatures/send \
  -F "file=@contract.pdf" \
  -F "documentName=Partnership Agreement" \
  -F 'recipients=[{"name":"John Doe","email":"john@example.com","order":1}]' \
  -F 'fields=[{"type":"signature","recipientEmail":"john@example.com","template":{"anchor":"{signature1}","placement":"replace","size":{"width":100,"height":30}}}]'

# Check signature status
curl http://localhost:8080/api/signatures/{documentId}/status
```

## Next Steps

1. Get your API credentials at https://app.turbodocx.com
2. Update `.env` with your real credentials
3. Run `mvn install` to download the SDK dependency
4. Start your server with `mvn spring-boot:run` and test the endpoints

## Documentation

- Docs: https://docs.turbodocx.com
- Support: https://discord.gg/NYKwz4BcpX
