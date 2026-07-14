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

## Deliverable

Document generation: render a TurboDocx template with variable substitution into a deliverable (DOCX/PPTX), then download it or hand its ID to TurboSign as the source document.

### Configuration

Build a Deliverable-only client with `buildDeliverableClient()` — it does NOT require `senderEmail`, since Deliverable never sends email.

```java
import com.turbodocx.DeliverableClient;
import com.turbodocx.models.deliverable.*;

DeliverableClient deliverable = new TurboDocxClient.Builder()
    .apiKey(System.getenv("TURBODOCX_API_KEY"))
    .orgId(System.getenv("TURBODOCX_ORG_ID"))
    .buildDeliverableClient();
```

A full `TurboDocxClient` (built with `.build()`) also exposes `client.deliverable()` alongside `client.turboSign()`.

### generateDeliverable

Generate a document from a template with variable substitution. Method and setter names are camelCase, and they serialize to the camelCase JSON keys (`templateId`, `mimeType`) the API expects verbatim.

```java
DeliverableVariable employeeVar = new DeliverableVariable();
employeeVar.setPlaceholder("{EmployeeName}");
employeeVar.setText("John Smith");
employeeVar.setMimeType("text");

DeliverableVariable companyVar = new DeliverableVariable();
companyVar.setPlaceholder("{CompanyName}");
companyVar.setText("TechCorp Inc.");
companyVar.setMimeType("text");

CreateDeliverableRequest createReq = new CreateDeliverableRequest();
createReq.setName("Employee Contract - John Smith");
createReq.setTemplateId("template-uuid");
createReq.setVariables(List.of(employeeVar, companyVar));
createReq.setDescription("Generated via API for HR onboarding"); // optional
createReq.setTags(List.of("hr", "contract"));                    // optional

CreateDeliverableResponse created = deliverable.generateDeliverable(createReq);
DeliverableRecord d = created.getResults().getDeliverable();
System.out.println(d.getId() + "  " + d.getName() + "  " + d.getFileType());
```

`mimeType` is one of `"text"`, `"html"`, `"image"`, or `"markdown"`. For repeating content (tables, lists), set a variable stack on a `DeliverableVariable`.

### listDeliverables

```java
ListDeliverablesRequest listReq = new ListDeliverablesRequest();
listReq.setLimit(20);   // 1-100, default 6
listReq.setOffset(0);
listReq.setQuery("contract");
listReq.setShowTags(true);

DeliverableListResponse list = deliverable.listDeliverables(listReq);
System.out.println(list.getTotalRecords());
for (DeliverableRecord record : list.getResults()) {
    System.out.println("  " + record.getId() + "  " + record.getName());
}
```

Pagination uses `offset`, not a page number. Call `deliverable.listDeliverables()` (no args) for defaults.

### getDeliverableDetails

```java
DeliverableRecord details = deliverable.getDeliverableDetails(deliverableId, true);
System.out.println(details.getName() + "  " + details.getTemplateName());
```

Returns a full `DeliverableRecord` (unwrapped from `results`), including variables and (when `showTags` is true) tags.

### updateDeliverableInfo

```java
UpdateDeliverableRequest updateReq = new UpdateDeliverableRequest();
updateReq.setName("Employee Contract - John Smith (Final)");
updateReq.setDescription("Finalized version");
updateReq.setTags(List.of("hr", "contract", "finalized")); // replaces all existing tags

UpdateDeliverableResponse updated = deliverable.updateDeliverableInfo(deliverableId, updateReq);
System.out.println(updated.getMessage() + "  " + updated.getDeliverableId());
```

Setting `tags` **replaces** the full tag set. Pass an empty list to clear all tags; leave it unset to keep existing tags untouched.

### deleteDeliverable

```java
DeleteDeliverableResponse deleted = deliverable.deleteDeliverable(deliverableId);
System.out.println(deleted.getMessage()); // soft delete — data is retained but hidden from list
```

### downloadSourceFile / downloadPDF

Both return a raw `byte[]` — write it straight to disk.

```java
byte[] docxBytes = deliverable.downloadSourceFile(deliverableId);
Files.write(Paths.get("contract.docx"), docxBytes);

byte[] pdfBytes = deliverable.downloadPDF(deliverableId);
Files.write(Paths.get("contract.pdf"), pdfBytes);
```

`downloadSourceFile` returns the original DOCX/PPTX and requires the `hasFileDownload` entitlement.

### Generate, then send for signature

A full `TurboDocxClient` exposes both modules, so you can generate and sign without downloading and re-uploading:

```java
TurboDocxClient client = new TurboDocxClient.Builder()
    .apiKey(System.getenv("TURBODOCX_API_KEY"))
    .orgId(System.getenv("TURBODOCX_ORG_ID"))
    .senderEmail(System.getenv("TURBODOCX_SENDER_EMAIL"))
    .build();

DeliverableVariable clientVar = new DeliverableVariable();
clientVar.setPlaceholder("{ClientName}");
clientVar.setText("Acme Corp");
clientVar.setMimeType("text");

CreateDeliverableRequest genReq = new CreateDeliverableRequest();
genReq.setName("Consulting Agreement");
genReq.setTemplateId("template-uuid");
genReq.setVariables(List.of(clientVar));

CreateDeliverableResponse gen = client.deliverable().generateDeliverable(genReq);

SendSignatureResponse signed = client.turboSign().sendSignature(
    new SendSignatureRequest.Builder()
        .deliverableId(gen.getResults().getDeliverable().getId()) // no download/re-upload
        .documentName("Consulting Agreement")
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
```

## TurboPartner

Partner-portal operations: provision and manage customer organizations, their users, API keys, entitlements, and audit logs. Uses **separate partner credentials**. Every method returns a Gson `JsonObject` with `success`, `data`, and optionally `message`. Request-body map keys are **camelCase** (e.g. `maxUsers`, `canManageOrgs`).

### Configuration

```java
TurboPartnerClient partner = new TurboPartnerClient.Builder()
    .partnerApiKey(System.getenv("TURBODOCX_PARTNER_API_KEY")) // starts with TDXP-
    .partnerId(System.getenv("TURBODOCX_PARTNER_ID"))          // UUID
    .build();

TurboPartner tp = partner.turboPartner();
```

### Organization management

```java
// Create
JsonObject org = tp.createOrganization(
    "Acme Corp",
    Map.of("industry", "Technology"),           // metadata (or null)
    Map.of("maxUsers", 50, "hasTDAI", true));   // optional initial entitlements; camelCase keys
System.out.println(org.getAsJsonObject("data").get("id").getAsString());

// List (uses limit/offset, not page)
JsonObject orgs = tp.listOrganizations(20, 0, "acme");
System.out.println(orgs.getAsJsonObject("data").get("totalRecords"));

// Get details (includes features + tracking)
JsonObject details = tp.getOrganizationDetails("org-uuid");

// Update name
tp.updateOrganizationInfo("org-uuid", "Acme Holdings");

// Delete
tp.deleteOrganization("org-uuid");

// Update entitlements — features and tracking are separate maps
tp.updateOrganizationEntitlements(
    "org-uuid",
    Map.of("maxUsers", 100, "hasTDAI", true, "hasSalesforce", true), // features
    Map.of("numUsers", 12));                                          // tracking (or null)
```

### Organization user management

```java
// List
JsonObject users = tp.listOrganizationUsers("org-uuid", 25, 0, null);

// Invite — ORG role enum: "admin" | "contributor" | "user" | "viewer"
// ("member" is a PARTNER-portal role and is rejected here with a 400.)
tp.addUserToOrganization("org-uuid", "newhire@acme.com", "contributor");

// Update role
tp.updateOrganizationUserRole("org-uuid", "user-uuid", "admin");

// Remove
tp.removeUserFromOrganization("org-uuid", "user-uuid");

// Resend invitation email
tp.resendOrganizationInvitationToUser("org-uuid", "user-uuid");
```

### Organization API key management

```java
// List
JsonObject keys = tp.listOrganizationApiKeys("org-uuid", 10, 0, null);

// Create — the full key value is returned ONLY on creation, store it immediately
// Org API keys use the ORG role enum: "admin" | "contributor" | "user" | "viewer"
JsonObject created = tp.createOrganizationApiKey("org-uuid", "Production Key", "admin");
System.out.println(created.getAsJsonObject("data").get("key").getAsString()); // capture once

// Update (rename or change role)
tp.updateOrganizationApiKey("org-uuid", "key-uuid", "Renamed", null);

// Revoke
tp.revokeOrganizationApiKey("org-uuid", "key-uuid");
```

### Partner API key management

```java
// List
JsonObject keys = tp.listPartnerApiKeys(10, 0, null);

// Create with scopes — full key returned only on creation
JsonObject created = tp.createPartnerApiKey(
    "CI/CD Key",
    List.of("org:create", "org:read", "entitlements:update"),
    "Used by GitHub Actions");
System.out.println(created.getAsJsonObject("data").get("key").getAsString()); // store immediately

// Update name / description / scopes
tp.updatePartnerApiKey(
    "key-uuid",
    "CI/CD Key (extended)",
    null,
    List.of("org:create", "org:read", "org:update", "entitlements:update"));

// Revoke
tp.revokePartnerApiKey("key-uuid");
```

Available scopes cover `org:*`, `entitlements:update`, `org-users:*`, `partner-users:*`, `org-apikeys:*`, `partner-apikeys:*`, and `audit:read` (see `PartnerScope`).

### Partner-portal user management

```java
// List
JsonObject users = tp.listPartnerPortalUsers(25, 0, null);

// Add — PARTNER role enum: "admin" | "member" | "viewer"
// ("contributor" / "user" are ORG roles and are rejected here with a 400.)
// All SEVEN permission keys are required.
tp.addUserToPartnerPortal(
    "admin@partner.com",
    "admin",
    Map.of(
        "canManageOrgs", true,
        "canManageOrgUsers", true,
        "canManagePartnerUsers", false,
        "canManageOrgAPIKeys", true,
        "canManagePartnerAPIKeys", false,
        "canUpdateEntitlements", true,
        "canViewAuditLogs", true));

// Update — the permissions map is optional, but there is NO partial update:
// if you pass a map at all it must contain ALL SEVEN keys, or the backend returns
// 400. Read the current permissions first, then override only what changes.
JsonObject currentUser = null;
for (JsonElement e : tp.listPartnerPortalUsers(100, 0, null)
                       .getAsJsonObject("data").getAsJsonArray("results")) {
    if ("user-uuid".equals(e.getAsJsonObject().get("id").getAsString())) {
        currentUser = e.getAsJsonObject();
        break;
    }
}

Map<String, Boolean> permissions = new HashMap<>();
JsonObject currentPerms = currentUser.getAsJsonObject("permissions");
for (String key : currentPerms.keySet()) {          // all 7 keys, from the server
    permissions.put(key, currentPerms.get(key).getAsBoolean());
}
permissions.put("canManageOrgs", true);             // then override only what changes
permissions.put("canManageOrgUsers", true);

tp.updatePartnerUserPermissions("user-uuid", "member", permissions);

// To change ONLY the role, pass null for the permissions map:
tp.updatePartnerUserPermissions("user-uuid", "viewer", null);

// Remove
tp.removeUserFromPartnerPortal("user-uuid");

// Resend invitation
tp.resendPartnerPortalInvitationToUser("user-uuid");
```

### Audit logs

```java
// (limit, offset, search, action, resourceType, resourceId, success, startDate, endDate)
JsonObject logs = tp.getPartnerAuditLogs(
    100, 0, null, "org.created", "organization", null, true, "2026-01-01", "2026-12-31");
System.out.println(logs.getAsJsonObject("data").get("totalRecords"));
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
    Arrays.asList("https://your-server.example.com/webhooks/turbodocx"),      // 1-10, HTTPS only
    Arrays.asList("signature.document.completed", "signature.document.voided") // at least 1
);
System.out.println("id: "     + created.get("id").getAsString());
System.out.println("secret: " + created.get("secret").getAsString()); // shown ONCE — save immediately
```

`urls` must contain **1–10** HTTPS URLs and `events` at least **1** event, or the backend throws `ValidationException` (400). Webhook management requires an **administrator** API key.

### getWebhook

Returns the webhook record plus aggregate `deliveryStats` and the server-provided event catalog. All TurboWebhooks methods return `JsonObject` so new fields surface without an SDK upgrade.

```java
JsonObject webhook = webhooks.getWebhook();
```

### updateWebhook

Patch any subset of fields. Pass `null` for fields you don't want to change. Renaming is not supported.

```java
JsonObject updated = webhooks.updateWebhook(
    Arrays.asList("https://new-server.example.com/hook"),  // urls — 1-10 HTTPS URLs
    null,                                                   // events (unchanged)
    Boolean.FALSE                                           // isActive
);

// To pause deliveries without touching the routing, pass null for both lists:
webhooks.updateWebhook(null, null, Boolean.FALSE);
```

`null` means "leave unchanged" — but an **empty list is not the same as null**. If you pass a non-null `urls` it still has to hold 1–10 URLs, and a non-null `events` still has to hold at least 1; `Collections.emptyList()` throws `ValidationException` (400). Pass `null` to skip a field.

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
req.setTermDays(365);   // optional; DEFAULT IS 60. Max 3650 (10 years). -1 = auto-renewal.
req.setCurrency(Currency.USD);

Quote quote = tq.createQuote(req);
System.out.println("Quote ID: " + quote.getId());
System.out.println("Status: "   + quote.getStatus()); // "draft"
```

**`termDays` / `renewalPeriod`** — `termDays` defaults to **60** when unset, and may be any integer up to **3650**, or the sentinel **`-1`** meaning auto-renewal. The two fields are coupled:

- `termDays == -1` → `renewalPeriod` is **required** (`RenewalPeriod.WEEKLY | MONTHLY | QUARTERLY | ANNUALLY`).
- any other `termDays` → `renewalPeriod` must be **unset/null**; sending it is a 400.

```java
// Auto-renewing quote — renewalPeriod is mandatory
CreateQuoteRequest autoRenew = new CreateQuoteRequest();
autoRenew.setName("Managed Services - auto-renew");
autoRenew.setCompanyId(companyId);
autoRenew.setContactId(contactId);
autoRenew.setTermDays(-1);
autoRenew.setRenewalPeriod(RenewalPeriod.MONTHLY);
tq.createQuote(autoRenew);

// Fixed-term quote — leave renewalPeriod null
CreateQuoteRequest fixed = new CreateQuoteRequest();
fixed.setName("Fixed 90-day engagement");
fixed.setCompanyId(companyId);
fixed.setContactId(contactId);
fixed.setTermDays(90);
tq.createQuote(fixed);
```

### addLineItems

`addLineItems` accepts either a single `AddLineItemRequest` or a `List` — the single-item overload is auto-wrapped internally. The list is capped at **50 items** per call (reorder allows up to 200).

**Four fields are required on every line item**: `productId` (the key must be present on the wire — its value may be `null` for a custom, non-catalog item), `productName`, `unitPrice`, and `billingFrequency`. `quantity` defaults to 1.

```java
AddLineItemRequest item = new AddLineItemRequest();
item.setProductId(productId);      // REQUIRED — null = ad-hoc item, a real ID links a catalog product
item.setProductName("Enterprise License"); // REQUIRED
item.setUnitPrice(1200.00);        // REQUIRED
item.setBillingFrequency("annual"); // REQUIRED
item.setQuantity(5.0);             // optional, defaults to 1
item.setDiscountType(DiscountType.PERCENT);
item.setDiscountPercent(10.0);

List<LineItem> lineItems = tq.addLineItems(quote.getId(), item);
System.out.println("Total line items: " + lineItems.size());
```

### addBundleLineItems

Attaching a bundle to a quote needs only `bundleId` and `bundleName` — the server expands the bundle's child products itself, so you never send them. Single request or a `List` of 1–50.

```java
AddBundleLineItemRequest bundleItem = new AddBundleLineItemRequest();
bundleItem.setBundleId(bundle.getId());   // REQUIRED
bundleItem.setBundleName("Starter Pack"); // REQUIRED
bundleItem.setQuantity(2.0);

List<LineItem> bundleItems = tq.addBundleLineItems(quote.getId(), bundleItem);
```

### sendQuote

```java
SendQuoteResponse sent = tq.sendQuote(quote.getId());
System.out.println("Status: " + sent.getQuote().getStatus()); // "sent"
System.out.println(sent.getMessage());
```

### handleExpiredQuote

Act on a sent quote whose `validUntil` has passed. **`action` accepts exactly two values: `"void"` and `"decline"`.** There is no `"extend"` and no `"resend"` — those are not implemented and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are **both required**.

The endpoint voids/declines the original quote and creates a duplicate carrying the new `validUntil` date — that duplicate is how you "extend" an expired quote.

```java
HandleExpiredQuoteRequest expired = new HandleExpiredQuoteRequest();
expired.setAction("void");                       // "void" | "decline" — nothing else
expired.setReason("Pricing refreshed for Q4");   // REQUIRED, max 190 chars
expired.setNewValidUntil("2026-12-31");          // REQUIRED, ISO date — carried by the duplicate

tq.handleExpiredQuote(quote.getId(), expired);
```

### downloadQuotePdf

```java
byte[] pdf = tq.downloadQuotePdf(quoteId);
Files.write(Paths.get("quote.pdf"), pdf);
```

### Catalog example (product / bundle / pricebook)

```java
// Create a product.
// name, listPrice, billingFrequency and categoryId are all REQUIRED.
// categoryId is a real UUID — from a createType(...) with categoryType PRODUCT_CATEGORY.
// Product images (if any) are capped at 5 per product, 2 MB each.
CreateProductRequest prod = new CreateProductRequest();
prod.setName("Support Add-On");
prod.setListPrice(500.00);
prod.setBillingFrequency("annual");
prod.setCategoryId(productCategoryId);
Product product = tq.createProduct(prod);

// Create a bundle. categoryId is required, and each BundleItemInput requires
// productId, unitPrice and billingFrequency (quantity defaults to 1). Note this is a
// DIFFERENT shape from a quote line item — there is no productName on a bundle item.
BundleItemInput bundleItem = new BundleItemInput();
bundleItem.setProductId(product.getId());
bundleItem.setUnitPrice(500.00);
bundleItem.setBillingFrequency("annual");
bundleItem.setQuantity(1.0);

CreateBundleRequest bundle = new CreateBundleRequest();
bundle.setName("Starter Pack");
bundle.setCategoryId(bundleCategoryId);
bundle.setItems(List.of(bundleItem));
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

Every product row requires `name`, `categoryId`, `listPrice`, and `billingFrequency`. **`categoryId` must be a real category UUID** — there is no category-by-name convenience field on the bulk row, and because the backend rejects unknown keys a name-based field would 400 the row. Resolve (or create) the category first and pass its UUID:

```java
import com.turbodocx.models.quote.CreateProductRequest;
import com.turbodocx.models.quote.CreateQuoteTypeRequest;
import com.turbodocx.models.quote.BulkImportResult;
import com.turbodocx.models.quote.BulkImportRowIssue;
import java.util.List;

// 1. Resolve the category UUID once — create it if it doesn't exist yet.
String categoryId = tq.listTypes().getResults().stream()
    .filter(t -> "Subscriptions".equals(t.getName())
              && CategoryType.PRODUCT_CATEGORY.equals(t.getCategoryType()))
    .map(QuoteType::getId)
    .findFirst()
    .orElse(null);

if (categoryId == null) {
    CreateQuoteTypeRequest type = new CreateQuoteTypeRequest();
    type.setName("Subscriptions");
    type.setCategoryType(CategoryType.PRODUCT_CATEGORY);
    categoryId = tq.createType(type).getId();   // createType throws IOException
}

// 2. Reference it by UUID on every row.
CreateProductRequest basic = new CreateProductRequest();
basic.setName("Basic Plan");
basic.setListPrice(10.00);
basic.setBillingFrequency("monthly");
basic.setCategoryId(categoryId);

CreateProductRequest premium = new CreateProductRequest();
premium.setName("Premium Plan");
premium.setListPrice(100.00);
premium.setBillingFrequency("monthly");
premium.setCategoryId(categoryId);

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
- **Rows are validated against the strict backend schema and unknown keys are rejected.** For products the required row fields are exactly `name`, `categoryId` (UUID), `listPrice`, `billingFrequency` — there is no category-by-name shortcut.

### Quote templates (auto-provisioned — get, then update)

Quote templates are **provisioned for you**. `GET /v1/quote-template` self-heals: if the org has no template it creates one from the org's branding and returns it. Consequences:

- **Never call `createTemplate()` on an established org** — a template already exists, so it throws `ValidationException` (400 `TEMPLATE_ALREADY_EXISTS`). The method is effectively unreachable. Do not write get-then-create-if-missing logic.
- **`deleteTemplate()` is really "reset to org branding defaults"** — it soft-deletes, and the very next `getTemplate()` regenerates one.

The correct flow is always **`getTemplate()` → `updateTemplate()`**:

```java
QuoteTemplate template = tq.getTemplate();   // always returns one; creates it if needed

UpdateQuoteTemplateRequest update = new UpdateQuoteTemplateRequest();
update.setPrimaryColor("#0B5FFF");
update.setClosingMessage("Thanks for your business!");

tq.updateTemplate(template.getId(), update);
```

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
| `builder.buildDeliverableClient()` | Build a Deliverable client (no senderEmail needed) |
| `deliverable.generateDeliverable(req)` | Render a template with variables into a new deliverable |
| `deliverable.listDeliverables(req)` | Paginated list with search and tag filters |
| `deliverable.getDeliverableDetails(id, showTags)` | Get full record including variables and fonts |
| `deliverable.updateDeliverableInfo(id, req)` | Update name, description, or tags (tags replace) |
| `deliverable.deleteDeliverable(id)` | Soft-delete (data retained, hidden from list) |
| `deliverable.downloadSourceFile(id)` | Download original DOCX/PPTX as `byte[]` |
| `deliverable.downloadPDF(id)` | Download rendered PDF as `byte[]` |
| `new TurboPartnerClient.Builder()...build().turboPartner()` | Construct a `TurboPartner` (partnerApiKey, partnerId) |
| `tp.createOrganization(name, metadata, features)` | Provision a new customer org |
| `tp.listOrganizations(limit, offset, search)` | List managed orgs (uses limit/offset, not page) |
| `tp.getOrganizationDetails(id)` | Get org details including features + tracking |
| `tp.updateOrganizationInfo(id, name)` | Rename an org |
| `tp.deleteOrganization(id)` | Delete an org |
| `tp.updateOrganizationEntitlements(id, features, tracking)` | Update features and/or tracking |
| `tp.listOrganizationUsers(id, limit, offset, search)` | Paginated org-user list |
| `tp.addUserToOrganization(id, email, role)` | Invite a user with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `tp.updateOrganizationUserRole(id, userId, role)` | Change a user's ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `tp.removeUserFromOrganization(id, userId)` | Remove user from org |
| `tp.resendOrganizationInvitationToUser(id, userId)` | Resend invite email |
| `tp.listOrganizationApiKeys(id, limit, offset, search)` | Paginated org API-key list |
| `tp.createOrganizationApiKey(id, name, role)` | Create org key with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`); value returned only on creation |
| `tp.updateOrganizationApiKey(id, keyId, name, role)` | Rename or change role |
| `tp.revokeOrganizationApiKey(id, keyId)` | Revoke org key |
| `tp.listPartnerApiKeys(limit, offset, search)` | Paginated partner API-key list |
| `tp.createPartnerApiKey(name, scopes, description)` | Create partner key with scopes |
| `tp.updatePartnerApiKey(keyId, name, description, scopes)` | Rename, edit scopes |
| `tp.revokePartnerApiKey(keyId)` | Revoke partner key |
| `tp.listPartnerPortalUsers(limit, offset, search)` | Paginated partner-portal user list |
| `tp.addUserToPartnerPortal(email, role, permissions)` | Invite with a PARTNER role (`admin` \| `member` \| `viewer`) + all 7 permission keys |
| `tp.updatePartnerUserPermissions(userId, role, permissions)` | Update role and/or permissions. The map may be `null`, but if supplied it must contain **all 7 keys** — there is no partial update |
| `tp.removeUserFromPartnerPortal(userId)` | Remove partner-portal user |
| `tp.resendPartnerPortalInvitationToUser(userId)` | Resend invite email |
| `tp.getPartnerAuditLogs(limit, offset, search, action, resourceType, resourceId, success, startDate, endDate)` | Filter audit logs |
| `new TurboDocxClient.Builder()...buildWebhooksClient()` | Construct an admin-scoped `TurboWebhooks` (no `senderEmail` required) |
| `webhooks.createWebhook(urls, events)` | Subscribe the org to events. `urls`: 1–10 HTTPS URLs; `events`: at least 1. Requires an **administrator** API key |
| `webhooks.getWebhook()` | Get the org's signature webhook + delivery stats |
| `webhooks.updateWebhook(urls, events, isActive)` | Patch URLs / events / isActive (pass `null` to skip). A non-null `urls`/`events` still has to be non-empty — an empty list is a 400 |
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
| `tq.handleExpiredQuote(id, req)` | Void or decline an expired sent quote and re-issue it as a duplicate. `action` is `"void"` \| `"decline"` only; `reason` (max 190) and `newValidUntil` (ISO date) are both required |
| `tq.listLineItems(quoteId)` | List line items on a quote |
| `tq.addLineItems(quoteId, item)` | Add 1–50 product line items (single or `List` overload). `productId` (may be null), `productName`, `unitPrice`, `billingFrequency` all required |
| `tq.addBundleLineItems(quoteId, items)` | Add 1–50 bundle line items; each needs only `bundleId` + `bundleName` (the server expands the children) |
| `tq.updateLineItem(quoteId, itemId, req)` | Update a line item |
| `tq.removeLineItem(quoteId, itemId)` | Remove a line item |
| `tq.listProducts(options)` | List products in the catalog |
| `tq.createProduct(req)` | Create a product; `categoryId` required (supports image upload via multipart — max 5 images, 2 MB each) |
| `tq.bulkCreateProducts(rows)` | Bulk-import products; each row needs `name`, `categoryId` (UUID), `listPrice`, `billingFrequency`. Returns a partial-success `BulkImportResult` |
| `tq.getProduct(id)` | Get product by ID |
| `tq.updateProduct(id, req)` | Update a product (max 5 images, 2 MB each) |
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
| `tq.getTemplate()` | Get the org's singleton quote template. Self-heals: auto-creates one from org branding if none exists, so it always returns a template |
| `tq.getTemplateById(id)` | Get a specific quote template by ID |
| `tq.createTemplate(req)` | Effectively unreachable — the template is auto-provisioned, so this throws 400 `TEMPLATE_ALREADY_EXISTS` on any established org. Use `getTemplate()` → `updateTemplate()` |
| `tq.updateTemplate(id, req)` | Update a quote template — this is how you customize it |
| `tq.deleteTemplate(id)` | Reset to org branding defaults (soft-delete; the next `getTemplate()` regenerates one) |
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
- **`download` is a two-step operation.** `GET /api/signature/:id/download` returns JSON `{"downloadUrl", "fileName"}` — not bytes — and the presigned `downloadUrl` must then be fetched **without an `Authorization` header** (S3 rejects a presigned request that also carries one). The SDK does both steps for you; hand-rolled REST calls must too.
- **Two different role enums — do not mix them.** Organization users and organization API keys take `"admin" | "contributor" | "user" | "viewer"`. Partner-portal users take `"admin" | "member" | "viewer"`. `"member"` is not a valid org role, and `"contributor"` / `"user"` are not valid partner roles — either mistake is a 400.
- **Partner `permissions` has no partial update.** The map argument may be `null` on `updatePartnerUserPermissions`, but every key inside it is required by the backend, so a non-null map must contain **all seven**: `canManageOrgs`, `canManageOrgUsers`, `canManagePartnerUsers`, `canManageOrgAPIKeys`, `canManagePartnerAPIKeys`, `canUpdateEntitlements`, `canViewAuditLogs`. A `Map.of(...)` with a subset is a 400. To flip one flag, read the user's current permissions and copy all 7 across; to change only the role, pass `null` for the map.
- **`updateOrganizationEntitlements` takes `features` and `tracking` — the two key sets are not interchangeable.** `features` holds capability/limit columns (`maxUsers`, `maxStorage`, `maxAPIKeys`, `hasTDAI`, …); `tracking` holds usage counters, which use the `num*` names: `numUsers`, `numProjectspaces`, `numTemplates`, `storageUsed`, `numGeneratedDeliverables`, `numSignaturesUsed`, `numQuotesSent`, `currentAICredits`. A `maxUsers` key inside `tracking` is rejected. `currentAICredits` accepts `-1` (unlimited); every other counter floors at 0.
- **TurboWebhooks needs an admin TDX- key** — the backend route gate is `requireOrgRole(administrator)`. Non-admin keys return `AuthorizationException` (403).
- **`WebhookSignatureVerifier` is a static utility** (final class, private constructor) — Java has no free functions, so call it as `WebhookSignatureVerifier.verify(...)`. Semantically equivalent to the free-function form in JS / Py / Go / PHP.
- **Read raw bytes for signature verification.** In Spring, bind to `@RequestBody byte[] rawBody` — never `Map`/DTO. Jackson would re-serialize and whitespace mismatch breaks HMAC. In Servlets, use `request.getInputStream().readAllBytes()`.
- **One webhook per org, fixed name `signature`.** There is no `listWebhooks` method by design — the SDK stays in sync with the dashboard's Signature Webhooks page. Use the REST API directly for multi-webhook setups.
- **Webhook secrets are shown ONCE** — capture `created.get("secret").getAsString()` immediately. `regenerateWebhookSecret()` returns a new one and invalidates the old immediately.
- **HTTPS-only URLs** — `http://` returns `ValidationException` (400).
- **`urls` is 1–10, `events` is 1+ — on create AND on update.** `null` means "leave unchanged" on `updateWebhook`, but an **empty list is not null**: a non-null `urls`/`events` still has to satisfy the minimum, so `Collections.emptyList()` is a 400. Pass `null` to skip a field.
- **Catch `ConflictException` (409) on `createWebhook`** — the signature webhook may already exist from a previous run; update or delete instead.

- **TurboQuote decimal fields come back as numbers, not strings.** The Java `ResponseNormalizer` (`FlexIntAdapter`) coerces string-serialized decimals (`listPrice`, `unitPrice`, `discountPercent`, `grandTotal`, `subtotal`, etc.) to `double`. Do not attempt to parse them manually from the raw JSON.
- **`PATCH` null-clears nullable fields.** On `updateQuote`, `updateLineItem`, and similar PATCH methods, explicitly setting a field to `null` sends `null` in the request body and clears the value on the server. Fields you never set are omitted from the request entirely and left unchanged. This matters for fields like `priceBookId`, `validUntil`, and `taxRate`.
- **`discountType` must be `"percent"` or `"amount"`.** Use the `DiscountType` enum constants (`DiscountType.PERCENT` / `DiscountType.AMOUNT`) to avoid silent 400 errors. Passing a raw string bypasses compile-time checking.
- **Every product line item needs four fields: `productId`, `productName`, `unitPrice`, `billingFrequency`.** `productId` must be *set*, but its value may be `null` — that is how you add a custom, non-catalog item. `quantity` defaults to 1.
- **Three distinct bundle shapes — don't conflate them.** `createBundle`'s `items` (`BundleItemInput`, the catalog bundle contents) need `productId`, `unitPrice`, `billingFrequency` and nothing else — there is no product name on a bundle item. `addBundleLineItems` (attaching a bundle to a quote) needs only `bundleId` + `bundleName`; the server expands the child products for you.
- **Line-item list limits: `addLineItems` and `addBundleLineItems` accept 1–50 items per call; reorder accepts up to 200.** Chunk larger imports.
- **`termDays` defaults to 60** (not 30), maxes out at 3650, and `-1` means auto-renewal. `renewalPeriod` (the `RenewalPeriod` enum: `WEEKLY` / `MONTHLY` / `QUARTERLY` / `ANNUALLY`) is **required when `termDays` is -1** and must be null for any other `termDays` — setting it otherwise is a 400.
- **`handleExpiredQuote` only accepts `action` `"void"` or `"decline"`.** `"extend"` and `"resend"` do not exist in the API and return a 400. `reason` (max 190 chars) and `newValidUntil` (ISO date) are both required — neither is optional; the endpoint voids/declines the original and issues a duplicate carrying the new date, and that duplicate *is* the "extend".
- **Quote templates are auto-provisioned.** `getTemplate()` self-heals — it creates one from org branding when none exists — so `createTemplate()` on an established org throws 400 `TEMPLATE_ALREADY_EXISTS` and is effectively unreachable. Always do `getTemplate()` → `updateTemplate()`. `deleteTemplate()` is a reset-to-branding-defaults, not a permanent removal.
- **Product images: max 5 per product, 2 MB each.** Exceeding either returns 400 `MAX_IMAGES_EXCEEDED`.
- **Bulk creates are partial-success, not transactional.** `bulkCreateProducts`/`bulkCreatePriceBooks`/`bulkCreateBundles`/`bulkCreateCompanies`/`bulkCreateContacts`/`bulkCreateTypes` never throw on a bad row — read `result.getFailed()` (`List<BulkImportRowIssue>` with 1-indexed `getRow()` + `getReason()`) and `result.getAdjusted()`; earlier rows are not rolled back. Cap is 500 rows/request (over → `ValidationException` 400). Admin + contributor keys only.
- **Bulk product rows take `categoryId`, never a category name.** The row schema is strict and rejects unknown keys. Resolve or create the category with `listTypes()` / `createType()` first and pass its UUID. Required per row: `name`, `categoryId`, `listPrice`, `billingFrequency`.

**Full API reference:** https://docs.turbodocx.com/docs
