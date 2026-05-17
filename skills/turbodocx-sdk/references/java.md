# Java SDK Reference

## Install

### Maven

```xml
<dependency>
    <groupId>com.turbodocx</groupId>
    <artifactId>turbodocx-sdk</artifactId>
    <version>0.2.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.turbodocx:turbodocx-sdk:0.2.0'
```

### Gradle (Kotlin DSL)

```kotlin
implementation("com.turbodocx:turbodocx-sdk:0.2.0")
```

## Imports

```java
import com.turbodocx.TurboDocxClient;
import com.turbodocx.TurboPartnerClient;
import com.turbodocx.models.*;
```

## TurboSign Configuration

```java
TurboDocxClient client = new TurboDocxClient.Builder()
    .apiKey(System.getenv("TURBODOCX_API_KEY"))
    .orgId(System.getenv("TURBODOCX_ORG_ID"))
    .senderEmail(System.getenv("TURBODOCX_SENDER_EMAIL"))
    .senderName(System.getenv("TURBODOCX_SENDER_NAME"))
    .build();
```

## TurboSign Usage

### sendSignature

```java
byte[] pdfFile = Files.readAllBytes(Paths.get("contract.pdf"));

SendSignatureResponse result = client.turboSign().sendSignature(
    new SendSignatureRequest.Builder()
        .file(pdfFile)
        .fileName("contract.pdf")
        .documentName("Partnership Agreement")
        .recipients(Arrays.asList(
            new Recipient("John Doe", "john@example.com", 1)
        ))
        .fields(Arrays.asList(
            new Field.Builder()
                .type("signature")
                .recipientEmail("john@example.com")
                .template(new Field.TemplateAnchor.Builder()
                    .anchor("{signature1}")
                    .placement("replace")
                    .size(new Field.Size(100, 30))
                    .build())
                .build()
        ))
        .build()
);

System.out.println("Document ID: " + result.getDocumentId());
```

### getStatus

```java
DocumentStatus status = client.turboSign().getStatus(documentId);
System.out.println("Status: " + status.getStatus());

for (RecipientStatus r : status.getRecipients()) {
    System.out.println("  " + r.getEmail() + ": " + r.getStatus());
}
```

### download

```java
byte[] pdf = client.turboSign().download(documentId);
Files.write(Paths.get("signed.pdf"), pdf);
```

### createSignatureReviewLink

Prepares the document with recipients and fields but **does not send signature emails** — use this to preview field placement before sending.

```java
CreateSignatureReviewLinkResponse review = client.turboSign().createSignatureReviewLink(
    new CreateSignatureReviewLinkRequest.Builder()
        .file(pdfFile)
        .fileName("nda.pdf")
        .documentName("NDA - Acme")
        .recipients(Arrays.asList(
            new Recipient("John Doe", "john@example.com", 1)
        ))
        .fields(Arrays.asList(
            new Field.Builder()
                .type("signature")
                .recipientEmail("john@example.com")
                .page(1)
                .x(100).y(500).width(200).height(50)
                .build()
        ))
        .build()
);

System.out.println("Document ID: " + review.getDocumentId());
System.out.println("Preview URL: " + review.getPreviewUrl()); // open to review field placement
// Each recipient also has a signUrl for their personal signing link
for (RecipientResponse r : review.getRecipients()) {
    System.out.println("  " + r.getName() + ": " + r.getSignUrl());
}
```

### voidDocument

```java
VoidDocumentResponse voided = client.turboSign().voidDocument(documentId, "Counterparty requested changes");
System.out.println("Status: " + voided.getStatus());    // "voided"
System.out.println("Voided at: " + voided.getVoidedAt());
```

`reason` is **required**.

### resendEmail

```java
// recipientIds are UUIDs — fetch from sendSignature/createSignatureReviewLink response or getAuditTrail
List<String> recipientIds = Arrays.asList("recipient-uuid-1", "recipient-uuid-2");
ResendEmailResponse result = client.turboSign().resendEmail(documentId, recipientIds);
System.out.println("Resent to " + result.getRecipientCount() + " recipients");
```

### getAuditTrail

```java
AuditTrailResponse audit = client.turboSign().getAuditTrail(documentId);
System.out.println("Document: " + audit.getDocument().getName());

for (AuditTrailEntry entry : audit.getAuditTrail()) {
    String userEmail = entry.getUser() != null ? entry.getUser().getEmail() : "";
    System.out.println(entry.getTimestamp() + "  " + entry.getActionType() + "  " + userEmail);
}
```

## TurboPartner Configuration

```java
TurboPartnerClient partner = new TurboPartnerClient.Builder()
    .partnerApiKey(System.getenv("TURBODOCX_PARTNER_API_KEY"))
    .partnerId(System.getenv("TURBODOCX_PARTNER_ID"))
    .build();
```

## TurboPartner Usage

### createOrganization

```java
CreateOrganizationResponse org = partner.turboPartner().createOrganization(
    new CreateOrganizationRequest.Builder()
        .name("Acme Corp")
        .features(Map.of("maxUsers", 50, "hasTDAI", true))
        .build()
);

System.out.println("Org ID: " + org.getData().getId());
```

### listOrganizations

```java
ListOrganizationsResponse orgs = partner.turboPartner().listOrganizations(1, 20);

System.out.println("Total: " + orgs.getTotal());
for (Organization o : orgs.getData()) {
    System.out.println("  " + o.getName() + " (" + o.getId() + ")");
}
```

## Spring Boot Integration Example

```java
// src/main/java/.../config/TurboDocxConfig.java
package com.example.app.config;

import com.turbodocx.TurboDocxClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TurboDocxConfig {

    @Bean
    public TurboDocxClient turboDocxClient(
        @Value("${TURBODOCX_API_KEY}") String apiKey,
        @Value("${TURBODOCX_ORG_ID}") String orgId,
        @Value("${TURBODOCX_SENDER_EMAIL}") String senderEmail,
        @Value("${TURBODOCX_SENDER_NAME:}") String senderName
    ) {
        return new TurboDocxClient.Builder()
            .apiKey(apiKey)
            .orgId(orgId)
            .senderEmail(senderEmail)
            .senderName(senderName)
            .build();
    }
}
```

```java
// src/main/java/.../controller/SignatureController.java
package com.example.app.controller;

import com.turbodocx.TurboDocxClient;
import com.turbodocx.models.*;
import com.turbodocx.exceptions.TurboDocxException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import java.util.List;

@RestController
@RequestMapping("/api/signatures")
public class SignatureController {

    private final TurboDocxClient client;
    private final ObjectMapper objectMapper;

    public SignatureController(TurboDocxClient client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendSignature(
        @RequestParam("file") MultipartFile file,
        @RequestParam("documentName") String documentName,
        @RequestParam("recipients") String recipientsJson,
        @RequestParam("fields") String fieldsJson
    ) {
        try {
            List<Recipient> recipients = objectMapper.readValue(
                recipientsJson, new TypeReference<>() {}
            );
            List<Field> fields = objectMapper.readValue(
                fieldsJson, new TypeReference<>() {}
            );

            SendSignatureResponse result = client.turboSign().sendSignature(
                new SendSignatureRequest.Builder()
                    .file(file.getBytes())
                    .fileName(file.getOriginalFilename())
                    .documentName(documentName)
                    .recipients(recipients)
                    .fields(fields)
                    .build()
            );

            return ResponseEntity.ok(result);
        } catch (TurboDocxException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Signature request failed");
        }
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<?> getStatus(@PathVariable String id) {
        try {
            DocumentStatus status = client.turboSign().getStatus(id);
            return ResponseEntity.ok(status);
        } catch (TurboDocxException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getMessage());
        }
    }
}
```

## TurboWebhooks

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### Configuration

`buildWebhooksClient()` does NOT require `senderEmail` — webhook routes don't send signature emails. It returns a `TurboWebhooks` instance directly (no `.turboWebhooks()` accessor on the parent client).

```java
import com.turbodocx.TurboDocxClient;
import com.turbodocx.TurboWebhooks;

TurboWebhooks webhooks = new TurboDocxClient.Builder()
    .apiKey(System.getenv("TURBODOCX_API_KEY"))   // must be an admin TDX- key
    .orgId(System.getenv("TURBODOCX_ORG_ID"))
    .baseUrl(System.getenv("TURBODOCX_BASE_URL")) // optional, defaults to api.turbodocx.com
    .buildWebhooksClient();
```

### createWebhook

```java
import com.google.gson.JsonObject;
import java.util.Arrays;

JsonObject created = webhooks.createWebhook(
    Arrays.asList("https://your-server.example.com/webhooks/turbodocx"),
    Arrays.asList("signature.document.completed", "signature.document.voided")
);
System.out.println("id: "     + created.get("id").getAsString());
System.out.println("secret: " + created.get("secret").getAsString()); // shown ONCE — save immediately
```

### getWebhook

Returns the webhook record plus aggregate `deliveryStats` and the server-provided event catalog. All TurboWebhooks methods return `JsonObject` so new fields surface without an SDK upgrade.

```java
JsonObject webhook = webhooks.getWebhook();
```

### updateWebhook

Patch any subset of fields. Pass `null` for fields you don't want to change. Renaming is not supported.

```java
JsonObject updated = webhooks.updateWebhook(
    Arrays.asList("https://new-server.example.com/hook"),  // urls
    null,                                                   // events (unchanged)
    Boolean.FALSE                                           // isActive
);
```

### deleteWebhook

```java
JsonObject deleted = webhooks.deleteWebhook(); // soft-delete; delivery history wiped
```

### testWebhook / notifyWebhook

`testWebhook` and `notifyWebhook` route through the same backend handler — prefer `testWebhook` in new code. The response carries a `summary` with `successful` / `failed` counts and a per-URL `errors` list when any delivery fails.

```java
import java.util.LinkedHashMap;
import java.util.Map;

Map<String, Object> payload = new LinkedHashMap<>();
payload.put("documentId",   "00000000-0000-0000-0000-000000000000");
payload.put("documentName", "Smoke test");

JsonObject result = webhooks.testWebhook("signature.document.completed", payload);
```

### regenerateWebhookSecret

```java
JsonObject rotated = webhooks.regenerateWebhookSecret();
String newSecret = rotated.get("secret").getAsString(); // shown ONCE
```

Rotating immediately invalidates old signatures.

### listWebhookDeliveries

Pass `null` for any filter you don't want to apply. The no-arg overload skips all filters.

```java
JsonObject page = webhooks.listWebhookDeliveries(
    50,                              // limit
    null,                            // offset
    "signature.document.completed",  // eventType
    Boolean.TRUE,                    // isDelivered
    null                             // httpStatus
);
```

### replayWebhookDelivery

```java
JsonObject replayed = webhooks.replayWebhookDelivery(deliveryId);
```

### getWebhookStats

```java
JsonObject stats = webhooks.getWebhookStats(30); // sliding window in days; pass null for backend default
```

### Verifying inbound webhook signatures (Spring Boot)

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. Java has no free functions — the helper is exposed as `WebhookSignatureVerifier.verify(...)`, a static method on a final utility class. It enforces a 5-minute timestamp tolerance and uses `MessageDigest.isEqual` for constant-time comparison.

```java
package com.example.webhooks;

import com.turbodocx.WebhookSignatureVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TurboDocxWebhookController {

    @Value("${turbodocx.webhook.secret}")
    private String secret;

    // IMPORTANT: bind to byte[], not a parsed @RequestBody Map / DTO.
    // The signature is computed over raw bytes — Jackson would re-serialize
    // and lose whitespace, which breaks verification.
    @PostMapping(value = "/webhooks/turbodocx", consumes = "application/json")
    public ResponseEntity<Void> receive(
            @RequestBody byte[] rawBody,
            @RequestHeader("X-TurboDocx-Signature") String signature,
            @RequestHeader("X-TurboDocx-Timestamp") String timestamp) {

        if (!WebhookSignatureVerifier.verify(rawBody, signature, timestamp, secret)) {
            return ResponseEntity.status(401).build();
        }

        // Now safe to parse rawBody as JSON and dispatch on event.eventType.
        return ResponseEntity.ok().build();
    }
}
```

For a plain Servlet receiver, read the body with `request.getInputStream().readAllBytes()` instead of `@RequestBody byte[]`; everything else stays the same.

**Canonical end-to-end Java example:** [`packages/java-sdk/examples/TurboWebhooksCrud.java`](https://github.com/TurboDocx/SDK/blob/main/packages/java-sdk/examples/TurboWebhooksCrud.java) walks through create → conflict → get → update → test-fire → rotate → list → delete + every error branch.

### TurboWebhooks error handling

```java
import com.turbodocx.TurboDocxException;

try {
    webhooks.createWebhook(urls, events);
} catch (TurboDocxException.ConflictException e) {
    // 409 — webhook with that name already exists; update or delete
} catch (TurboDocxException.ValidationException e) {
    // 400 — non-HTTPS URL or empty events
} catch (TurboDocxException.AuthorizationException e) {
    // 403 — TDX- key lacks administrator role
} catch (TurboDocxException.AuthenticationException e) {
    // 401 — bad / revoked API key
} catch (TurboDocxException.NotFoundException e) {
    // 404 — webhook does not exist
} catch (TurboDocxException.RateLimitException e) {
    // 429 — back off and retry
} catch (TurboDocxException.NetworkException e) {
    // never reached the server
}
```

## Error Handling

```java
import com.turbodocx.exceptions.*;

try {
    client.turboSign().sendSignature(request);
} catch (AuthenticationException e) {
    // Invalid/missing API key
} catch (ValidationException e) {
    // Bad request (e.g., missing senderEmail)
} catch (NotFoundException e) {
    // Document/org not found
} catch (RateLimitException e) {
    // Too many requests
} catch (NetworkException e) {
    // Connection failure
} catch (TurboDocxException e) {
    // Catch-all for any SDK error
    System.err.println("Error " + e.getCode() + ": " + e.getMessage());
}
```

## Method Reference

| Method | Description |
|--------|-------------|
| `client.turboSign().sendSignature(req)` | Send document for e-signature |
| `client.turboSign().createSignatureReviewLink(req)` | Preview without emails |
| `client.turboSign().getStatus(id)` | Get document + recipient status |
| `client.turboSign().download(id)` | Download signed PDF as byte[] |
| `client.turboSign().voidDocument(id)` | Cancel a signature request |
| `client.turboSign().resendEmail(id, recipientIds)` | Resend signature email to recipient UUIDs |
| `client.turboSign().getAuditTrail(id)` | Get complete audit trail |
| `partner.turboPartner().createOrganization(req)` | Provision a new customer org |
| `partner.turboPartner().listOrganizations(page, limit)` | List managed organizations |
| `partner.turboPartner().getOrganization(id)` | Get org details |
| `partner.turboPartner().updateEntitlements(id, features)` | Update org entitlements |
| `new TurboDocxClient.Builder()...buildWebhooksClient()` | Construct an admin-scoped `TurboWebhooks` (no `senderEmail` required) |
| `webhooks.createWebhook(urls, events)` | Subscribe the org to events (HTTPS URLs only) |
| `webhooks.getWebhook()` | Get the org's signature webhook + delivery stats |
| `webhooks.updateWebhook(urls, events, isActive)` | Patch URLs / events / isActive (pass `null` to skip) |
| `webhooks.deleteWebhook()` | Soft-delete the webhook |
| `webhooks.testWebhook(eventType, payload)` | Fire a test delivery; surfaces per-URL errors |
| `webhooks.notifyWebhook(eventType, payload)` | Manual notify; same backend handler as testWebhook |
| `webhooks.regenerateWebhookSecret()` | Rotate the HMAC secret (shown ONCE) |
| `webhooks.listWebhookDeliveries(limit, offset, eventType, isDelivered, httpStatus)` | Paginated delivery history with filters |
| `webhooks.replayWebhookDelivery(deliveryId)` | Retry a past delivery; returns the new delivery row |
| `webhooks.getWebhookStats(days)` | Aggregate stats over a sliding window (`null` = backend default) |
| `WebhookSignatureVerifier.verify(rawBody, sigHeader, tsHeader, secret)` | Static utility; verifies inbound deliveries |

## Gotchas

- **Java SDK uses Builder pattern** — create clients with `.Builder()...build()`
- **`senderEmail` is required** for TurboSign operations
- **Spring Boot**: use `@Value` or `application.properties` for env vars, not `System.getenv()` directly
- **Spring Boot auto-scans** controllers in sub-packages — ensure your controller is under the base package
- **Partner API keys are distinct** from regular API keys — using the wrong one returns `AuthenticationException`
- **File input** accepts: `byte[]`, file path `String`, URL `String`, or `InputStream`
- **`signUrl`** — each `RecipientResponse` in the `sendSignature`/`createSignatureReviewLink` response has a `getSignUrl()` method: the personal signing link for that recipient. `CreateSignatureReviewLinkResponse` also has `getPreviewUrl()` for document-level preview.
- **`resendEmail` takes recipient UUIDs** (`List<String>`), not email addresses — fetch them from the send/review response or `getAuditTrail`.
- **TurboWebhooks needs an admin TDX- key** — the backend route gate is `requireOrgRole(administrator)`. Non-admin keys return `AuthorizationException` (403).
- **`WebhookSignatureVerifier` is a static utility** (final class, private constructor) — Java has no free functions, so call it as `WebhookSignatureVerifier.verify(...)`. Semantically equivalent to the free-function form in JS / Py / Go / PHP.
- **Read raw bytes for signature verification.** In Spring, bind to `@RequestBody byte[] rawBody` — never `Map`/DTO. Jackson would re-serialize and whitespace mismatch breaks HMAC. In Servlets, use `request.getInputStream().readAllBytes()`.
- **One webhook per org, fixed name `signature`.** There is no `listWebhooks` method by design — the SDK stays in sync with the dashboard's Signature Webhooks page. Use the REST API directly for multi-webhook setups.
- **Webhook secrets are shown ONCE** — capture `created.get("secret").getAsString()` immediately. `regenerateWebhookSecret()` returns a new one and invalidates the old immediately.
- **HTTPS-only URLs** — `http://` returns `ValidationException` (400).
- **Catch `ConflictException` (409) on `createWebhook`** — the signature webhook may already exist from a previous run; update or delete instead.

**Full API reference:** https://docs.turbodocx.com/docs
