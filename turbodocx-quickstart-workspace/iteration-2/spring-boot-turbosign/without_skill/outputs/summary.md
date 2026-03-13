# TurboSign Integration Summary

## Files Modified

- `pom.xml` — Added `com.turbodocx:turbodocx-java:1.0.0` dependency
- `src/main/resources/application.properties` — Added TurboSign configuration properties (`turbosign.api-key`, `turbosign.base-url`, `turbosign.webhook-url`)

## Files Created

- `.env.example` — Environment variable template for TurboDocx API key and webhook URL
- `src/main/java/com/example/app/config/TurboSignConfig.java` — Spring `@Configuration` that creates a `TurboDocxClient` bean from application properties
- `src/main/java/com/example/app/dto/SignatureRequest.java` — Request DTO with document URL, document name, signers list, callback URL, and message
- `src/main/java/com/example/app/dto/SignatureResponse.java` — Response DTO with signature request ID, status, per-signer statuses, timestamps, and signed document URL
- `src/main/java/com/example/app/service/TurboSignService.java` — Service layer wrapping the TurboDocx SDK for send, status check, and cancel operations
- `src/main/java/com/example/app/controller/TurboSignController.java` — REST controller exposing TurboSign endpoints

## REST Endpoints

| Method | Path                       | Description                          |
|--------|----------------------------|--------------------------------------|
| POST   | `/api/signatures`          | Send a document for digital signing  |
| GET    | `/api/signatures/{id}`     | Check signature request status       |
| DELETE | `/api/signatures/{id}`     | Cancel a pending signature request   |
| POST   | `/api/signatures/webhook`  | Receive TurboSign status callbacks   |

## Dependencies Added

- `com.turbodocx:turbodocx-java:1.0.0` — TurboDocx Java SDK (requires `mvn install` to fetch)

## Environment Variables Required

- `TURBODOCX_API_KEY` — Your TurboDocx API key (required)
- `TURBODOCX_BASE_URL` — API base URL (optional, defaults to `https://api.turbodocx.com`)
- `TURBOSIGN_WEBHOOK_URL` — Webhook callback URL for signature status updates (optional)
