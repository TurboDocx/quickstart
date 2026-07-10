# Java SDK Reference

## Install

### Maven

```xml
<dependency>
    <groupId>com.turbodocx</groupId>
    <artifactId>turbodocx-sdk</artifactId>
    <version>0.4.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.turbodocx:turbodocx-sdk:0.4.0'
```

### Gradle (Kotlin DSL)

```kotlin
implementation("com.turbodocx:turbodocx-sdk:0.4.0")
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

## TurboQuote

TurboQuote provides end-to-end CPQ (configure-price-quote) operations: create and send professional quotes, manage your product catalog and bundles, apply pricebooks, and handle the full quote lifecycle (draft, sent, accepted, declined, voided).

### Configuration

`TurboQuoteClient` does NOT require `senderEmail` — quote routes do not send TurboSign signature emails. `orgId` is technically optional in the config but the backend will return 401 if it is missing, so always supply it.

```java
import com.turbodocx.TurboQuoteClient;
import com.turbodocx.TurboQuote;

TurboQuote tq = new TurboQuoteClient.Builder()
    .apiKey(System.getenv("TURBODOCX_API_KEY"))
    .orgId(System.getenv("TURBODOCX_ORG_ID"))
    // .baseUrl(System.getenv("TURBODOCX_BASE_URL")) // optional, defaults to api.turbodocx.com
    .build()
    .turboQuote();
```

### createQuote

```java
CreateQuoteRequest req = new CreateQuoteRequest();
req.setName("Q1 Software Proposal");
req.setCompanyId(companyId);
req.setContactId(contactId);
req.setTermDays(30);
req.setCurrency(Currency.USD);

Quote quote = tq.createQuote(req);
System.out.println("Quote ID: " + quote.getId());
System.out.println("Status: "   + quote.getStatus()); // "draft"
```

### addLineItems

`addLineItems` accepts either a single `AddLineItemRequest` or a `List` — the single-item overload is auto-wrapped internally.

```java
AddLineItemRequest item = new AddLineItemRequest();
item.setProductName("Enterprise License");
item.setProductId(null);           // null = ad-hoc line item; pass a real ID to link a catalog product
item.setUnitPrice(1200.00);
item.setQuantity(5.0);
item.setBillingFrequency("annual");
item.setDiscountType(DiscountType.PERCENT);
item.setDiscountPercent(10.0);

List<LineItem> lineItems = tq.addLineItems(quote.getId(), item);
System.out.println("Total line items: " + lineItems.size());
```

### sendQuote

```java
SendQuoteResponse sent = tq.sendQuote(quote.getId());
System.out.println("Status: " + sent.getQuote().getStatus()); // "sent"
System.out.println(sent.getMessage());
```

### downloadQuotePdf

```java
byte[] pdf = tq.downloadQuotePdf(quoteId);
Files.write(Paths.get("quote.pdf"), pdf);
```

### Catalog example (product / bundle / pricebook)

```java
// Create a product
CreateProductRequest prod = new CreateProductRequest();
prod.setName("Support Add-On");
prod.setListPrice(500.00);
prod.setBillingFrequency("annual");
Product product = tq.createProduct(prod);

// Create a bundle
CreateBundleRequest bundle = new CreateBundleRequest();
bundle.setName("Starter Pack");
Bundle b = tq.createBundle(bundle);

// Create and apply a pricebook — name, priceBookTypeId, validFrom, and discountPercent are all required.
// priceBookTypeId comes from a createType(...) with categoryType PRICEBOOK_TYPE.
CreatePriceBookRequest pb = new CreatePriceBookRequest();
pb.setName("Partner Pricing");
pb.setPriceBookTypeId(priceBookTypeId);
pb.setValidFrom("2025-01-01");
pb.setDiscountPercent(15.0);
PriceBook priceBook = tq.createPriceBook(pb);

ApplyPriceBookResponse applied = tq.applyPriceBook(quote.getId(), priceBook.getId());
System.out.println("Updated items: " + applied.getUpdatedCount());
System.out.println("Skipped items: " + applied.getSkippedCount());
```

### getQuoteNumberConfig

Admin-only. Reads the org's quote-numbering config — the `format` plus the per-period `currentFloor`.

```java
QuoteNumberConfig config = tq.getQuoteNumberConfig();
System.out.println("Prefix: "        + config.getFormat().getPrefix());
System.out.println("Current floor: " + config.getCurrentFloor()); // startNumber can't be set below this
```

Response: `{ format, currentFloor }`. `format` carries `prefix`, `yearToken`, `monthToken`, `separator`, `padWidth`, `suffix`, `startNumber`, `resetCadence` (field keys are camelCase verbatim); `currentFloor` is the highest number already issued for the current period.

### updateQuoteNumberConfig

Admin-only. Replaces the org's quote-number format (all eight fields are sent) so you can customize how new quote numbers are generated — prefix, year/month tokens, separator, zero-padding, suffix, starting number, and reset cadence.

```java
QuoteNumberFormat format = new QuoteNumberFormat();
format.setPrefix("INV");
format.setYearToken(QuoteNumberYearToken.NONE);
format.setMonthToken(QuoteNumberMonthToken.OFF);
format.setSeparator("-");
format.setPadWidth(4);                                  // integer 0-12
format.setSuffix("");
format.setStartNumber(1000);                            // integer >= 0, can't be below currentFloor
format.setResetCadence(QuoteNumberResetCadence.NEVER);

QuoteNumberConfig updated = tq.updateQuoteNumberConfig(format);
System.out.println("New prefix: "    + updated.getFormat().getPrefix());   // "INV"
System.out.println("Current floor: " + updated.getCurrentFloor());
```

Response: `{ format, currentFloor }` — the same shape as `getQuoteNumberConfig`. Request-body keys stay camelCase verbatim (`prefix`, `yearToken`, `monthToken`, `separator`, `padWidth`, `suffix`, `startNumber`, `resetCadence`); `padWidth` and `startNumber` are integers.

### Bulk create (CSV-style imports)

Six catalog resources support bulk creation from a `List` of typed request rows (e.g. a parsed CSV): `bulkCreateProducts`, `bulkCreatePriceBooks`, `bulkCreateBundles`, `bulkCreateCompanies`, `bulkCreateContacts`, and `bulkCreateTypes`. Each takes a `List` of the same request objects the matching single `create*` call uses; the SDK wraps them in the `{ "rows": [...] }` envelope the `POST {resource}/bulk` endpoint expects. Each returns a `BulkImportResult`.

```java
import com.turbodocx.models.quote.CreateProductRequest;
import com.turbodocx.models.quote.BulkImportResult;
import com.turbodocx.models.quote.BulkImportRowIssue;
import java.util.List;

CreateProductRequest basic = new CreateProductRequest();
basic.setName("Basic Plan");
basic.setListPrice(10.00);
basic.setBillingFrequency("monthly");
basic.setCategoryId("category-uuid");

CreateProductRequest premium = new CreateProductRequest();
premium.setName("Premium Plan");
premium.setListPrice(100.00);
premium.setBillingFrequency("monthly");
premium.setCategoryId("category-uuid");

BulkImportResult result = tq.bulkCreateProducts(List.of(basic, premium));

System.out.println("Imported: " + result.getImported());

// Partial success: inspect failed rows instead of assuming all-or-nothing
for (BulkImportRowIssue issue : result.getFailed()) {
    System.err.println("Row " + issue.getRow() + " failed: " + issue.getReason());   // row is 1-indexed
}
for (BulkImportRowIssue issue : result.getAdjusted()) {
    System.out.println("Row " + issue.getRow() + " adjusted: " + issue.getReason()); // imported with a server-side tweak
}
```

Response: a `BulkImportResult` — `getImported()` (int), `getFailed()` and `getAdjusted()` (`List<BulkImportRowIssue>`); each `BulkImportRowIssue` exposes `getRow()` (1-indexed int) and `getReason()` (String).

Bulk-create semantics:

- **Partial success** — a failed row does **not** throw and does **not** roll back the rows before it. It is reported by `result.getFailed()` with a 1-indexed row and a reason. Rows the server tweaked (e.g. an unknown bundle item dropped) appear in `result.getAdjusted()`. Always read `getFailed()` rather than assuming every row imported.
- **500-row cap per request** — more than 500 rows throws `ValidationException` (400). The SDK does not validate the rows or the cap client-side.
- **Roles** — available to administrator and contributor API keys.

### TurboQuote error handling

```java
import com.turbodocx.TurboDocxException;

try {
    tq.sendQuote(quoteId);
} catch (TurboDocxException.ValidationException e) {
    // 400 — e.g. quote has no line items, or quote is already sent
} catch (TurboDocxException.AuthenticationException e) {
    // 401 — bad / revoked API key, or missing orgId
} catch (TurboDocxException.NotFoundException e) {
    // 404 — quote or related resource does not exist
} catch (TurboDocxException.RateLimitException e) {
    // 429 — back off and retry
} catch (TurboDocxException e) {
    System.err.println("Error " + e.getStatusCode() + ": " + e.getMessage());
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
| `new TurboQuoteClient.Builder()...build().turboQuote()` | Construct a `TurboQuote` instance (no `senderEmail` required) |
| `tq.listQuotes(options)` | List quotes with optional filters (status, search, pagination) |
| `tq.createQuote(req)` | Create a new quote in draft status |
| `tq.getQuote(id)` | Get quote by ID (statusInfo merged into response) |
| `tq.updateQuote(id, req)` | PATCH quote fields; explicitly `null` fields are cleared |
| `tq.deleteQuote(id)` | Delete a quote |
| `tq.duplicateQuote(id)` | Duplicate a quote |
| `tq.applyPriceBook(quoteId, priceBookId)` | Apply pricebook to a quote; returns updatedCount + skippedCount |
| `tq.removePriceBook(quoteId)` | Remove applied pricebook from a quote |
| `tq.downloadQuotePdf(id)` | Download quote as PDF; returns raw `byte[]` |
| `tq.sendQuote(id)` | Send quote to recipient; transitions status to `sent` |
| `tq.sendQuoteWithDeliverable(id, req)` | Send quote and attach a TurboDocx deliverable |
| `tq.declineQuote(id, req)` | Decline a quote (reason required) |
| `tq.voidQuote(id, req)` | Void a quote (reason required) |
| `tq.handleExpiredQuote(id, req)` | Handle an expired sent quote (action + optional newValidUntil) |
| `tq.listLineItems(quoteId)` | List line items on a quote |
| `tq.addLineItems(quoteId, item)` | Add one or more line items (single or `List` overload) |
| `tq.addBundleLineItems(quoteId, items)` | Add bundle line items to a quote |
| `tq.updateLineItem(quoteId, itemId, req)` | Update a line item |
| `tq.removeLineItem(quoteId, itemId)` | Remove a line item |
| `tq.listProducts(options)` | List products in the catalog |
| `tq.createProduct(req)` | Create a product (supports image upload via multipart) |
| `tq.bulkCreateProducts(rows)` | Bulk-import products; returns a partial-success `BulkImportResult` |
| `tq.getProduct(id)` | Get product by ID |
| `tq.updateProduct(id, req)` | Update a product |
| `tq.deleteProduct(id)` | Delete a product |
| `tq.duplicateProduct(id)` | Duplicate a product |
| `tq.getProductPrimaryImages(productIds)` | Batch-fetch primary images for product IDs |
| `tq.listPriceBooks(options)` | List pricebooks |
| `tq.createPriceBook(req)` | Create a pricebook |
| `tq.bulkCreatePriceBooks(rows)` | Bulk-import price books; returns a partial-success `BulkImportResult` |
| `tq.getPriceBook(id)` | Get pricebook by ID |
| `tq.updatePriceBook(id, req)` | Update a pricebook |
| `tq.deletePriceBook(id)` | Delete a pricebook |
| `tq.duplicatePriceBook(id)` | Duplicate a pricebook |
| `tq.listPriceBookProducts(id, options)` | List products in a pricebook |
| `tq.listBundles(options)` | List bundles |
| `tq.createBundle(req)` | Create a bundle |
| `tq.bulkCreateBundles(rows)` | Bulk-import bundles; returns a partial-success `BulkImportResult` |
| `tq.getBundle(id)` | Get bundle by ID |
| `tq.updateBundle(id, req)` | Update a bundle |
| `tq.deleteBundle(id)` | Delete a bundle |
| `tq.duplicateBundle(id)` | Duplicate a bundle |
| `tq.listCompanies(options)` | List companies |
| `tq.createCompany(req)` | Create a company (contacts required) |
| `tq.bulkCreateCompanies(rows)` | Bulk-import companies; returns a partial-success `BulkImportResult` |
| `tq.getCompany(id)` | Get company by ID |
| `tq.updateCompany(id, req)` | Update a company |
| `tq.deleteCompany(id)` | Delete a company |
| `tq.listCompanyContacts(companyId, options)` | List contacts belonging to a company |
| `tq.listContacts(options)` | List contacts |
| `tq.createContact(req)` | Create a contact |
| `tq.bulkCreateContacts(rows)` | Bulk-import contacts; returns a partial-success `BulkImportResult` |
| `tq.updateContact(id, req)` | Update a contact |
| `tq.deleteContact(id)` | Delete a contact |
| `tq.listTemplates(options)` | List quote templates |
| `tq.getTemplate()` | Get the org's singleton quote template |
| `tq.getTemplateById(id)` | Get a specific quote template by ID |
| `tq.createTemplate(req)` | Create a quote template |
| `tq.updateTemplate(id, req)` | Update a quote template |
| `tq.deleteTemplate(id)` | Delete a quote template |
| `tq.listTypes(options)` | List quote types |
| `tq.createType(req)` | Create a quote type |
| `tq.bulkCreateTypes(rows)` | Bulk-import types/categories; returns a partial-success `BulkImportResult` |
| `tq.updateType(id, req)` | Update a quote type |
| `tq.deleteType(id)` | Delete a quote type |
| `tq.createAndSend(req)` | Convenience: create quote + add line items + add bundles + send in one call |
| `tq.getQuoteNumberConfig()` | Admin: get the org's quote-number config (`format` + `currentFloor`) |
| `tq.updateQuoteNumberConfig(format)` | Admin: replace the quote-number format; returns updated `{ format, currentFloor }` |

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

- **TurboQuote decimal fields come back as numbers, not strings.** The Java `ResponseNormalizer` (`FlexIntAdapter`) coerces string-serialized decimals (`listPrice`, `unitPrice`, `discountPercent`, `grandTotal`, `subtotal`, etc.) to `double`. Do not attempt to parse them manually from the raw JSON.
- **`PATCH` null-clears nullable fields.** On `updateQuote`, `updateLineItem`, and similar PATCH methods, explicitly setting a field to `null` sends `null` in the request body and clears the value on the server. Fields you never set are omitted from the request entirely and left unchanged. This matters for fields like `priceBookId`, `validUntil`, and `taxRate`.
- **`discountType` must be `"percent"` or `"amount"`.** Use the `DiscountType` enum constants (`DiscountType.PERCENT` / `DiscountType.AMOUNT`) to avoid silent 400 errors. Passing a raw string bypasses compile-time checking.
- **Bulk creates are partial-success, not transactional.** `bulkCreateProducts`/`bulkCreatePriceBooks`/`bulkCreateBundles`/`bulkCreateCompanies`/`bulkCreateContacts`/`bulkCreateTypes` never throw on a bad row — read `result.getFailed()` (`List<BulkImportRowIssue>` with 1-indexed `getRow()` + `getReason()`) and `result.getAdjusted()`; earlier rows are not rolled back. Cap is 500 rows/request (over → `ValidationException` 400). Admin + contributor keys only.

**Full API reference:** https://docs.turbodocx.com/docs
