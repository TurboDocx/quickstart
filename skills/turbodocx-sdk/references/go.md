# Go SDK Reference

## Install

```bash
go get github.com/TurboDocx/SDK/packages/go-sdk
```

Also install godotenv for .env loading:
```bash
go get github.com/joho/godotenv
```

Load in main:
```go
import "github.com/joho/godotenv"

func main() {
    godotenv.Load() // loads .env file
    // ...
}
```

## Import

```go
import turbodocx "github.com/TurboDocx/SDK/packages/go-sdk"
```

## TurboSign Configuration

```go
client, err := turbodocx.NewClientWithConfig(turbodocx.ClientConfig{
    APIKey:      os.Getenv("TURBODOCX_API_KEY"),
    OrgID:       os.Getenv("TURBODOCX_ORG_ID"),
    SenderEmail: os.Getenv("TURBODOCX_SENDER_EMAIL"),
    SenderName:  os.Getenv("TURBODOCX_SENDER_NAME"),
})
if err != nil {
    log.Fatal(err)
}
```

## TurboSign Usage

### SendSignature

```go
pdfFile, _ := os.ReadFile("contract.pdf")

result, err := client.TurboSign.SendSignature(ctx, &turbodocx.SendSignatureRequest{
    File:         pdfFile,
    FileName:     "contract.pdf",
    DocumentName: "Partnership Agreement",
    Recipients: []turbodocx.Recipient{
        {Name: "John Doe", Email: "john@example.com", SigningOrder: 1},
    },
    Fields: []turbodocx.Field{
        {
            Type:           "signature",
            RecipientEmail: "john@example.com",
            Template: &turbodocx.TemplateAnchor{
                Anchor:    "{signature1}",
                Placement: "replace",
                Size:      &turbodocx.Size{Width: 100, Height: 30},
            },
        },
    },
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Document ID: %s\n", result.DocumentID)
```

### GetStatus

```go
status, err := client.TurboSign.GetStatus(ctx, documentID)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Status: %s\n", status.Status)
for _, r := range status.Recipients {
    fmt.Printf("  %s: %s\n", r.Email, r.Status)
}
```

### Download

```go
pdf, err := client.TurboSign.Download(ctx, documentID)
if err != nil {
    log.Fatal(err)
}
os.WriteFile("signed.pdf", pdf, 0644)
```

### CreateSignatureReviewLink

Prepares the document with recipients and fields but **does not send signature emails** — use this to preview field placement before sending.

```go
review, err := client.TurboSign.CreateSignatureReviewLink(ctx, &turbodocx.CreateSignatureReviewLinkRequest{
    File:         pdfFile,
    FileName:     "nda.pdf",
    DocumentName: "NDA - Acme",
    Recipients: []turbodocx.Recipient{
        {Name: "John Doe", Email: "john@example.com", SigningOrder: 1},
    },
    Fields: []turbodocx.Field{
        {
            Type:           "signature",
            RecipientEmail: "john@example.com",
            Page:           1,
            X:              100,
            Y:              500,
            Width:          200,
            Height:         50,
        },
    },
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Document ID: %s\n", review.DocumentID)
fmt.Printf("Preview URL: %s\n", review.PreviewURL)  // open to review field placement
// Each recipient also has a SignURL for their personal signing link
for _, r := range review.Recipients {
    fmt.Printf("  %s: %s\n", r.Name, r.SignURL)
}
```

### VoidDocument

```go
voided, err := client.TurboSign.VoidDocument(ctx, documentID, "Counterparty requested changes")
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Status: %s\n", voided.Status)    // "voided"
fmt.Printf("Voided at: %s\n", voided.VoidedAt)
```

`reason` is **required**.

### ResendEmail

```go
// recipientIDs are UUIDs — fetch from SendSignature/CreateSignatureReviewLink response or GetAuditTrail
result, err := client.TurboSign.ResendEmail(ctx, documentID, []string{"recipient-uuid-1", "recipient-uuid-2"})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Resent to %d recipients\n", result.RecipientCount)
```

### GetAuditTrail

```go
audit, err := client.TurboSign.GetAuditTrail(ctx, documentID)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Document: %s\n", audit.Document.Name)

for _, entry := range audit.AuditTrail {
    userEmail := ""
    if entry.User != nil {
        userEmail = entry.User.Email
    }
    fmt.Printf("%s  %s  %s\n", entry.Timestamp, entry.ActionType, userEmail)
}
```

## TurboPartner Configuration

```go
partner, err := turbodocx.NewPartnerClient(turbodocx.PartnerConfig{
    PartnerAPIKey: os.Getenv("TURBODOCX_PARTNER_API_KEY"),
    PartnerID:     os.Getenv("TURBODOCX_PARTNER_ID"),
})
if err != nil {
    log.Fatal(err)
}
```

## TurboPartner Usage

### CreateOrganization

```go
org, err := partner.CreateOrganization(ctx, &turbodocx.CreateOrganizationRequest{
    Name: "Acme Corp",
    Features: &turbodocx.Features{
        MaxUsers: turbodocx.IntPtr(50),
        HasTDAI:  turbodocx.BoolPtr(true),
    },
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Org ID: %s\n", org.Data.ID)
```

### ListOrganizations

```go
orgs, err := partner.ListOrganizations(ctx, &turbodocx.ListOrganizationsRequest{
    Page:  1,
    Limit: 20,
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Total: %d\n", orgs.Total)
for _, org := range orgs.Data {
    fmt.Printf("  %s (%s)\n", org.Name, org.ID)
}
```

## net/http Handler Example

```go
package handlers

import (
    "encoding/json"
    "io"
    "net/http"

    turbodocx "github.com/TurboDocx/SDK/packages/go-sdk"
)

type SignatureHandler struct {
    client *turbodocx.Client
}

func NewSignatureHandler(client *turbodocx.Client) *SignatureHandler {
    return &SignatureHandler{client: client}
}

// POST /api/signatures/send
func (h *SignatureHandler) SendSignature(w http.ResponseWriter, r *http.Request) {
    file, _, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "file required", http.StatusBadRequest)
        return
    }
    defer file.Close()

    fileBytes, _ := io.ReadAll(file)
    documentName := r.FormValue("document_name")

    var recipients []turbodocx.Recipient
    json.Unmarshal([]byte(r.FormValue("recipients")), &recipients)

    var fields []turbodocx.Field
    json.Unmarshal([]byte(r.FormValue("fields")), &fields)

    result, err := h.client.TurboSign.SendSignature(r.Context(), &turbodocx.SendSignatureRequest{
        File:         fileBytes,
        DocumentName: documentName,
        Recipients:   recipients,
        Fields:       fields,
    })
    if err != nil {
        var tdxErr *turbodocx.TurboDocxError
        if errors.As(err, &tdxErr) {
            http.Error(w, tdxErr.Message, tdxErr.StatusCode)
            return
        }
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}

// GET /api/signatures/{id}/status
func (h *SignatureHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // Go 1.22+ net/http
    status, err := h.client.TurboSign.GetStatus(r.Context(), id)
    if err != nil {
        http.Error(w, "failed to get status", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(status)
}
```

## Error Handling

```go
import "errors"

result, err := client.TurboSign.SendSignature(ctx, req)
if err != nil {
    var tdxErr *turbodocx.TurboDocxError
    if errors.As(err, &tdxErr) {
        // tdxErr.Code       — machine-readable error code
        // tdxErr.Message    — human-readable description
        // tdxErr.StatusCode — HTTP status

        switch {
        case errors.As(err, new(*turbodocx.AuthenticationError)):
            // Invalid/missing API key
        case errors.As(err, new(*turbodocx.ValidationError)):
            // Bad request (e.g., missing SenderEmail)
        case errors.As(err, new(*turbodocx.NotFoundError)):
            // Document/org not found
        case errors.As(err, new(*turbodocx.RateLimitError)):
            // Too many requests
        }
    }
}
```

## Method Reference

| Method | Description |
|--------|-------------|
| `client.TurboSign.SendSignature(ctx, req)` | Send document for e-signature |
| `client.TurboSign.CreateSignatureReviewLink(ctx, req)` | Preview without emails |
| `client.TurboSign.GetStatus(ctx, id)` | Get document + recipient status |
| `client.TurboSign.Download(ctx, id)` | Download signed PDF as []byte |
| `client.TurboSign.VoidDocument(ctx, id, reason)` | Cancel a signature request (reason required) |
| `client.TurboSign.ResendEmail(ctx, id, recipientIDs)` | Resend signature email to recipient UUIDs |
| `client.TurboSign.GetAuditTrail(ctx, id)` | Get complete audit trail |
| `partner.CreateOrganization(ctx, req)` | Provision a new customer org |
| `partner.ListOrganizations(ctx, req)` | List managed organizations |
| `partner.GetOrganization(ctx, id)` | Get org details |
| `partner.UpdateEntitlements(ctx, id, features)` | Update org entitlements |

## Gotchas

- **Go SDK uses instance methods**, not static methods — create a client first with `NewClientWithConfig`
- **`SenderEmail` is required** in ClientConfig for TurboSign operations
- **Context is required** for all API calls — pass `context.Background()` or request context
- **Helper functions** `turbodocx.IntPtr()`, `turbodocx.BoolPtr()`, `turbodocx.StringPtr()` for optional pointer fields
- **File input** accepts: `[]byte`, file path string, or URL string
- **`SignURL`** — each `Recipient` in the `SendSignature`/`CreateSignatureReviewLink` response has a `SignURL` field: the personal signing link for that recipient. `CreateSignatureReviewLink` also returns a top-level `PreviewURL` for document-level preview.
- **`ResendEmail` takes recipient UUIDs** (`[]string`), not email addresses — fetch them from the send/review response recipients or from `GetAuditTrail`.

**Full API reference:** https://docs.turbodocx.com/docs
