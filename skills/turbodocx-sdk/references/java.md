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

## Gotchas

- **Java SDK uses Builder pattern** — create clients with `.Builder()...build()`
- **`senderEmail` is required** for TurboSign operations
- **Spring Boot**: use `@Value` or `application.properties` for env vars, not `System.getenv()` directly
- **Spring Boot auto-scans** controllers in sub-packages — ensure your controller is under the base package
- **Partner API keys are distinct** from regular API keys — using the wrong one returns `AuthenticationException`
- **File input** accepts: `byte[]`, file path `String`, URL `String`, or `InputStream`
- **`signUrl`** — each `RecipientResponse` in the `sendSignature`/`createSignatureReviewLink` response has a `getSignUrl()` method: the personal signing link for that recipient. `CreateSignatureReviewLinkResponse` also has `getPreviewUrl()` for document-level preview.
- **`resendEmail` takes recipient UUIDs** (`List<String>`), not email addresses — fetch them from the send/review response or `getAuditTrail`.

**Full API reference:** https://docs.turbodocx.com/docs
