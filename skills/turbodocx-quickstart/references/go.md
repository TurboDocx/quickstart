# Go SDK Reference

## Install

```bash
go get github.com/turbodocx/sdk
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
import turbodocx "github.com/turbodocx/sdk"
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

    turbodocx "github.com/turbodocx/sdk"
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
| `client.TurboSign.VoidDocument(ctx, id)` | Cancel a signature request |
| `client.TurboSign.ResendEmail(ctx, id, email)` | Resend signature email |
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
