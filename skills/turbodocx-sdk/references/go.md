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

## TurboWebhooks

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### Configuration

`NewWebhooksClientWithConfig` does NOT require `SenderEmail` — webhook routes don't send signature emails.

```go
wh, err := turbodocx.NewWebhooksClientWithConfig(turbodocx.ClientConfig{
    APIKey:  os.Getenv("TURBODOCX_API_KEY"),   // must be an admin TDX- key
    OrgID:   os.Getenv("TURBODOCX_ORG_ID"),
    BaseURL: os.Getenv("TURBODOCX_BASE_URL"),  // optional, defaults to api.turbodocx.com
})
if err != nil {
    log.Fatal(err)
}
```

### CreateWebhook

```go
created, err := wh.CreateWebhook(ctx, turbodocx.CreateWebhookRequest{
    URLs:   []string{"https://your-server.example.com/webhooks/turbodocx"},
    Events: []string{"signature.document.completed", "signature.document.voided"},
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("id: %s\n", created.ID)
fmt.Printf("secret: %s\n", created.Secret) // shown ONCE — save immediately
```

### GetWebhook

Returns the webhook record plus aggregate `deliveryStats` and the server-provided event catalog. The shape is returned as `map[string]interface{}` so new fields surface without an SDK upgrade.

```go
webhook, err := wh.GetWebhook(ctx)
```

### UpdateWebhook

Patch any subset of fields. Use `turbodocx.BoolPtr(false)` to toggle `IsActive`.

```go
updated, err := wh.UpdateWebhook(ctx, turbodocx.UpdateWebhookRequest{
    URLs:     []string{"https://new-server.example.com/hook"},
    IsActive: turbodocx.BoolPtr(false),
})
```

### DeleteWebhook

```go
_, err := wh.DeleteWebhook(ctx) // soft-delete; delivery history wiped
```

### TestWebhook / NotifyWebhook

`TestWebhook` and `NotifyWebhook` route through the same backend handler — prefer `TestWebhook` in new code. The response carries a `summary` with `successful` / `failed` counts and a per-URL `errors` list when any delivery fails.

```go
result, err := wh.TestWebhook(ctx, turbodocx.TestWebhookRequest{
    EventType: "signature.document.completed",
    Payload: map[string]interface{}{
        "documentId":   "00000000-0000-0000-0000-000000000000",
        "documentName": "Smoke test",
    },
})
```

### RegenerateWebhookSecret

```go
rotated, err := wh.RegenerateWebhookSecret(ctx)
newSecret := rotated["secret"] // shown ONCE
```

Rotating immediately invalidates old signatures.

### ListWebhookDeliveries

Pointer-typed filters — leave any field nil to skip it.

```go
limit := 50
delivered := true
page, err := wh.ListWebhookDeliveries(ctx, turbodocx.ListDeliveriesRequest{
    Limit:       &limit,
    EventType:   "signature.document.completed",
    IsDelivered: &delivered,
})
```

### ReplayWebhookDelivery

```go
replayed, err := wh.ReplayWebhookDelivery(ctx, deliveryID)
```

### GetWebhookStats

```go
stats, err := wh.GetWebhookStats(ctx, 30) // sliding window; pass 0 for backend default
```

### Verifying inbound webhook signatures (net/http)

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. The helper enforces a 5-minute timestamp tolerance and uses `hmac.Equal` for constant-time comparison.

```go
package handlers

import (
    "io"
    "net/http"
    "os"

    turbodocx "github.com/TurboDocx/SDK/packages/go-sdk"
)

func TurboDocxWebhook(w http.ResponseWriter, r *http.Request) {
    // IMPORTANT: read raw bytes — the signature is computed over them.
    // Decoding to a struct first will lose whitespace and break verification.
    rawBody, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "read failed", http.StatusBadRequest)
        return
    }
    defer r.Body.Close()

    signature := r.Header.Get("X-TurboDocx-Signature")
    timestamp := r.Header.Get("X-TurboDocx-Timestamp")
    secret := os.Getenv("TURBODOCX_WEBHOOK_SECRET")

    if !turbodocx.VerifyWebhookSignature(rawBody, signature, timestamp, secret, nil) {
        http.Error(w, "invalid signature", http.StatusUnauthorized)
        return
    }

    // Now safe to json.Unmarshal(rawBody, &event) and dispatch on event.eventType.
    w.WriteHeader(http.StatusOK)
}
```

**Canonical end-to-end Go example:** [`packages/go-sdk/examples/turbowebhooks_crud.go`](https://github.com/TurboDocx/SDK/blob/main/packages/go-sdk/examples/turbowebhooks_crud.go) walks through create → conflict → get → update → test-fire → rotate → list → delete + every error branch.

### TurboWebhooks error handling

```go
import "errors"

_, err := wh.CreateWebhook(ctx, req)
if err != nil {
    var conflict *turbodocx.ConflictError
    var valErr  *turbodocx.ValidationError
    var authz   *turbodocx.AuthorizationError
    var auth    *turbodocx.AuthenticationError
    var nf      *turbodocx.NotFoundError
    var rate    *turbodocx.RateLimitError
    var net     *turbodocx.NetworkError
    switch {
    case errors.As(err, &conflict): // 409 — already exists; update or delete
    case errors.As(err, &valErr):   // 400 — non-HTTPS URL or empty events
    case errors.As(err, &authz):    // 403 — TDX- key lacks administrator role
    case errors.As(err, &auth):     // 401 — bad / revoked API key
    case errors.As(err, &nf):       // 404 — webhook does not exist
    case errors.As(err, &rate):     // 429 — back off and retry
    case errors.As(err, &net):      // never reached the server
    }
}
```

## TurboQuote

TurboQuote is TurboDocx's CPQ (Configure, Price, Quote) module — manage companies, contacts, products, bundles, price books, and quotes. Create a quote, attach line items, apply price-book discounts, send to a prospect, and download the PDF.

### Configuration

`NewQuoteClient` does NOT require `SenderEmail` — quote operations do not send signature emails. `OrgID` is optional in config but the backend returns 401 if it is missing (set `TURBODOCX_ORG_ID` or pass it explicitly).

```go
qc, err := turbodocx.NewQuoteClient(turbodocx.QuoteClientConfig{
    APIKey: os.Getenv("TURBODOCX_API_KEY"),
    OrgID:  os.Getenv("TURBODOCX_ORG_ID"),
    // BaseURL: os.Getenv("TURBODOCX_BASE_URL"), // optional, defaults to api.turbodocx.com
})
if err != nil {
    log.Fatal(err)
}
```

### CreateQuote

```go
quote, err := qc.CreateQuote(ctx, &turbodocx.CreateQuoteRequest{
    Name:      "Acme Annual Subscription",
    CompanyID: companyID,
    ContactID: contactID,
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Quote ID: %s  Number: %s\n", quote.ID, quote.QuoteNumber)
// quote.Status == "draft"
```

### AddLineItems / AddBundleLineItems

`AddLineItems` is variadic — pass one struct or many; both routes send an array to the backend.

```go
qty := 3
items, err := qc.AddLineItems(ctx, quote.ID, turbodocx.AddLineItemRequest{
    ProductName:      "Professional License",
    UnitPrice:        499.00,
    BillingFrequency: "annual",
    Quantity:         &qty,
})
if err != nil {
    log.Fatal(err)
}
// Returns []LineItem — unitPrice, listPrice etc. are float64 (normalizer coerces strings)

// Add a bundle instead:
bundleItems, err := qc.AddBundleLineItems(ctx, quote.ID, turbodocx.AddBundleLineItemRequest{
    BundleID: bundleID,
    Quantity: &qty,
})
```

### SendQuote

```go
sent, err := qc.SendQuote(ctx, quote.ID, nil) // nil uses quote defaults
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Status: %s  Message: %s\n", sent.QuoteResult.Status, sent.Message)
// sent.QuoteResult.Status == "sent"
```

### DownloadQuotePdf

```go
pdf, err := qc.DownloadQuotePdf(ctx, quote.ID)
if err != nil {
    log.Fatal(err)
}
os.WriteFile("quote.pdf", pdf, 0600)
```

### ApplyPriceBook

```go
applyResp, err := qc.ApplyPriceBook(ctx, quote.ID, priceBookID)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Updated %d items, skipped %d\n", applyResp.UpdatedCount, applyResp.SkippedCount)
// applyResp.QuoteResult is the updated Quote
```

### Product / Bundle / PriceBook catalog

```go
// List products (paginated)
products, err := qc.ListProducts(ctx, nil)
fmt.Printf("Total: %d\n", products.TotalRecords)

// Create a product
product, err := qc.CreateProduct(ctx, &turbodocx.CreateProductRequest{
    Name:      "Enterprise Add-on",
    ListPrice: 799.00,
})

// Duplicate a bundle
dupe, err := qc.DuplicateBundle(ctx, bundleID)

// List price-book products
pbProducts, err := qc.ListPriceBookProducts(ctx, priceBookID, nil)
```

### CreateAndSend

Convenience method: creates the quote, adds line items and bundle items, then sends — in 2–4 sequential API calls.

```go
result, err := qc.CreateAndSend(ctx, &turbodocx.CreateAndSendRequest{
    Name:      "Acme - Q3 Deal",
    CompanyID: companyID,
    ContactID: contactID,
    Items: []turbodocx.AddLineItemRequest{
        {ProductName: "Starter Plan", UnitPrice: 99.00, BillingFrequency: "monthly"},
    },
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Quote %s sent\n", result.Quote.QuoteNumber)
```

### GetQuoteNumberConfig / UpdateQuoteNumberConfig

Admin-only. Customize how new quote numbers are generated — prefix, year/month tokens, separator, zero-padding, suffix, starting number, and reset cadence.

```go
// Fetch the org's current quote-number config
cfg, err := qc.GetQuoteNumberConfig(ctx)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Current prefix: %s  Floor: %d\n", cfg.Format.Prefix, cfg.CurrentFloor)

// Update with a custom format: e.g. INV-1000, INV-1001, ...
updated, err := qc.UpdateQuoteNumberConfig(ctx, &turbodocx.QuoteNumberFormat{
    Prefix:       "INV",
    YearToken:    turbodocx.QuoteNumberYearTokenNone, // "none" | "two" | "four"
    MonthToken:   turbodocx.QuoteNumberMonthTokenOff, // "off" | "two"
    Separator:    "-",
    PadWidth:     4, // zero-pad sequence to 4 digits (0-12)
    Suffix:       "",
    StartNumber:  1000, // can't be set below CurrentFloor
    ResetCadence: turbodocx.QuoteNumberResetCadenceNever, // "never" | "yearly" | "monthly"
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("New prefix: %s  Floor: %d\n", updated.Format.Prefix, updated.CurrentFloor)
```

Both methods return `{ format, currentFloor }`. `currentFloor` is the per-period issued floor (a read-only value the backend tracks — never sent in the PATCH body). Request-body keys stay camelCase verbatim: `prefix`, `yearToken`, `monthToken`, `separator`, `padWidth`, `suffix`, `startNumber`, `resetCadence` (`padWidth`/`startNumber` are integers).

### Bulk create (CSV-style imports)

Six catalog resources support bulk creation from a slice of typed request rows (e.g. a parsed CSV): `BulkCreateProducts`, `BulkCreatePriceBooks`, `BulkCreateBundles`, `BulkCreateCompanies`, `BulkCreateContacts`, and `BulkCreateTypes`. Each takes the same request struct as the matching single `Create*` call; the SDK wraps the rows in the `{ "rows": [...] }` envelope the `POST {resource}/bulk` endpoint expects. Each returns `(*BulkImportResult, error)`.

```go
result, err := qc.BulkCreateProducts(ctx, []turbodocx.CreateProductRequest{
    {Name: "Basic Plan",   ListPrice: 10,  BillingFrequency: "monthly", CategoryID: "category-uuid"},
    {Name: "Premium Plan", ListPrice: 100, BillingFrequency: "monthly", CategoryID: "category-uuid"},
})
if err != nil {
    log.Fatal(err) // only a transport/validation error (e.g. >500 rows) — NOT a per-row failure
}

fmt.Printf("Imported: %d\n", result.Imported)

// Partial success: inspect failed rows instead of assuming all-or-nothing
for _, f := range result.Failed {
    fmt.Printf("Row %d failed: %s\n", f.Row, f.Reason)     // Row is 1-indexed
}
for _, a := range result.Adjusted {
    fmt.Printf("Row %d adjusted: %s\n", a.Row, a.Reason)   // imported with a server-side tweak
}
```

Response: `*BulkImportResult` — `{ Imported int; Failed []BulkImportRowIssue; Adjusted []BulkImportRowIssue }`, where each `BulkImportRowIssue` is `{ Row int; Reason string }` (`Row` is 1-indexed into the rows you sent).

Bulk-create semantics:

- **Partial success** — a failed row does **not** return an error and does **not** roll back the rows before it. It is reported in `result.Failed` with a 1-indexed `Row` and a `Reason`. Rows the server tweaked (e.g. an unknown bundle item dropped) appear in `result.Adjusted`. Always read `result.Failed` rather than assuming every row imported — a non-nil `err` only signals a transport-level or request-level failure (e.g. exceeding the cap).
- **500-row cap per request** — more than 500 rows returns a 400 `*turbodocx.ValidationError`. The SDK does not validate the rows or the cap client-side.
- **Roles** — available to administrator and contributor API keys.

### TurboQuote error handling

```go
import "errors"

_, err := qc.SendQuote(ctx, quoteID, nil)
if err != nil {
    var valErr  *turbodocx.ValidationError
    var auth    *turbodocx.AuthenticationError
    var nf      *turbodocx.NotFoundError
    var rate    *turbodocx.RateLimitError
    switch {
    case errors.As(err, &valErr):  // 400 — e.g. quote not in a sendable status
    case errors.As(err, &auth):    // 401 — bad / revoked API key or missing OrgID
    case errors.As(err, &nf):      // 404 — quote does not exist
    case errors.As(err, &rate):    // 429 — back off and retry
    }
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
| `turbodocx.NewWebhooksClientWithConfig(cfg)` | Construct an admin-scoped webhook client (no SenderEmail required) |
| `wh.CreateWebhook(ctx, req)` | Subscribe the org to events (HTTPS URLs only) |
| `wh.GetWebhook(ctx)` | Get the org's signature webhook + delivery stats |
| `wh.UpdateWebhook(ctx, req)` | Patch URLs / events / isActive |
| `wh.DeleteWebhook(ctx)` | Soft-delete the webhook |
| `wh.TestWebhook(ctx, req)` | Fire a test delivery; surfaces per-URL errors |
| `wh.NotifyWebhook(ctx, req)` | Manual notify; same backend handler as TestWebhook |
| `wh.RegenerateWebhookSecret(ctx)` | Rotate the HMAC secret (shown ONCE) |
| `wh.ListWebhookDeliveries(ctx, req)` | Paginated delivery history with filters |
| `wh.ReplayWebhookDelivery(ctx, deliveryID)` | Retry a past delivery; returns the new delivery row |
| `wh.GetWebhookStats(ctx, days)` | Aggregate stats over a sliding window (0 = backend default) |
| `turbodocx.VerifyWebhookSignature(rawBody, sigHeader, tsHeader, secret, opts)` | Free function; verifies inbound deliveries |
| `turbodocx.NewQuoteClient(cfg)` | Construct a TurboQuote client (no SenderEmail required) |
| `qc.ListQuotes(ctx, opts)` | Paginated quote list with filters |
| `qc.CreateQuote(ctx, req)` | Create a new quote (status: draft) |
| `qc.GetQuote(ctx, id)` | Get quote + merged statusInfo |
| `qc.UpdateQuote(ctx, id, req)` | Patch quote fields; use `ClearPriceBookID()` etc. to null-clear |
| `qc.DeleteQuote(ctx, id)` | Delete a quote |
| `qc.DuplicateQuote(ctx, id)` | Duplicate a quote |
| `qc.ApplyPriceBook(ctx, quoteID, priceBookID)` | Apply price-book discounts; returns updatedCount / skippedCount |
| `qc.RemovePriceBook(ctx, quoteID)` | Remove price-book association from a quote |
| `qc.DownloadQuotePdf(ctx, id)` | Download quote as PDF ([]byte) |
| `qc.SendQuote(ctx, id, req)` | Send quote to prospect (req may be nil) |
| `qc.SendQuoteWithDeliverable(ctx, id, req)` | Send quote with a TurboDocx deliverable attachment |
| `qc.DeclineQuote(ctx, id, req)` | Decline a sent quote (reason required) |
| `qc.VoidQuote(ctx, id, req)` | Void a quote (reason required) |
| `qc.HandleExpiredQuote(ctx, id, req)` | Resend, extend, or void an expired sent quote |
| `qc.CreateAndSend(ctx, req)` | Convenience: create + add items + send in one call |
| `qc.GetQuoteNumberConfig(ctx)` | Get the org's quote-number config (admin; `{ format, currentFloor }`) |
| `qc.UpdateQuoteNumberConfig(ctx, format)` | Update the org's quote-number format (admin; returns `{ format, currentFloor }`) |
| `qc.ListLineItems(ctx, quoteID, opts)` | List line items for a quote |
| `qc.AddLineItems(ctx, quoteID, items...)` | Add one or more product line items (variadic) |
| `qc.AddBundleLineItems(ctx, quoteID, items...)` | Add one or more bundle line items (variadic) |
| `qc.UpdateLineItem(ctx, quoteID, itemID, req)` | Update a line item |
| `qc.RemoveLineItem(ctx, quoteID, itemID)` | Remove a line item |
| `qc.ListProducts(ctx, opts)` | Paginated product catalog |
| `qc.CreateProduct(ctx, req)` | Create a product (multipart when images provided) |
| `qc.BulkCreateProducts(ctx, rows)` | Bulk-import products; returns `(*BulkImportResult, error)` (partial success) |
| `qc.GetProduct(ctx, id)` | Get a product by ID |
| `qc.UpdateProduct(ctx, id, req)` | Update a product (multipart when images provided) |
| `qc.DeleteProduct(ctx, id)` | Delete a product |
| `qc.DuplicateProduct(ctx, id)` | Duplicate a product |
| `qc.GetProductPrimaryImages(ctx, productIDs)` | Batch-fetch primary images by product ID |
| `qc.ListPriceBooks(ctx, opts)` | Paginated price-book list |
| `qc.CreatePriceBook(ctx, req)` | Create a price book |
| `qc.BulkCreatePriceBooks(ctx, rows)` | Bulk-import price books; returns `(*BulkImportResult, error)` (partial success) |
| `qc.GetPriceBook(ctx, id)` | Get a price book by ID |
| `qc.UpdatePriceBook(ctx, id, req)` | Update a price book |
| `qc.DeletePriceBook(ctx, id)` | Delete a price book |
| `qc.DuplicatePriceBook(ctx, id)` | Duplicate a price book |
| `qc.ListPriceBookProducts(ctx, id, opts)` | List products associated with a price book |
| `qc.ListBundles(ctx, opts)` | Paginated bundle list |
| `qc.CreateBundle(ctx, req)` | Create a bundle |
| `qc.BulkCreateBundles(ctx, rows)` | Bulk-import bundles; returns `(*BulkImportResult, error)` (partial success) |
| `qc.GetBundle(ctx, id)` | Get a bundle by ID |
| `qc.UpdateBundle(ctx, id, req)` | Update a bundle |
| `qc.DeleteBundle(ctx, id)` | Delete a bundle |
| `qc.DuplicateBundle(ctx, id)` | Duplicate a bundle |
| `qc.ListCompanies(ctx, opts)` | Paginated company list |
| `qc.CreateCompany(ctx, req)` | Create a company (contacts required ≥ 1) |
| `qc.BulkCreateCompanies(ctx, rows)` | Bulk-import companies; returns `(*BulkImportResult, error)` (partial success) |
| `qc.GetCompany(ctx, id)` | Get a company by ID |
| `qc.UpdateCompany(ctx, id, req)` | Update a company |
| `qc.DeleteCompany(ctx, id)` | Delete a company |
| `qc.ListCompanyContacts(ctx, companyID, opts)` | List contacts for a specific company |
| `qc.ListContacts(ctx, opts)` | Paginated contact list |
| `qc.CreateContact(ctx, req)` | Create a contact |
| `qc.BulkCreateContacts(ctx, rows)` | Bulk-import contacts; returns `(*BulkImportResult, error)` (partial success) |
| `qc.UpdateContact(ctx, id, req)` | Update a contact |
| `qc.DeleteContact(ctx, id)` | Delete a contact |
| `qc.ListTemplates(ctx, opts)` | Paginated quote template list |
| `qc.GetTemplate(ctx)` | Get the active (singleton) quote template |
| `qc.GetTemplateByID(ctx, id)` | Get a specific quote template by ID |
| `qc.CreateTemplate(ctx, req)` | Create a quote template |
| `qc.UpdateTemplate(ctx, id, req)` | Update a quote template |
| `qc.DeleteTemplate(ctx, id)` | Delete a quote template |
| `qc.ListTypes(ctx, opts)` | Paginated quote types/categories list |
| `qc.CreateType(ctx, req)` | Create a quote type/category |
| `qc.BulkCreateTypes(ctx, rows)` | Bulk-import types/categories; returns `(*BulkImportResult, error)` (partial success) |
| `qc.UpdateType(ctx, id, req)` | Update a quote type/category |
| `qc.DeleteType(ctx, id)` | Delete a quote type/category |

## Gotchas

- **Go SDK uses instance methods**, not static methods — create a client first with `NewClientWithConfig`
- **`SenderEmail` is required** in ClientConfig for TurboSign operations
- **Context is required** for all API calls — pass `context.Background()` or request context
- **Helper functions** `turbodocx.IntPtr()`, `turbodocx.BoolPtr()`, `turbodocx.StringPtr()` for optional pointer fields
- **File input** accepts: `[]byte`, file path string, or URL string
- **`SignURL`** — each `Recipient` in the `SendSignature`/`CreateSignatureReviewLink` response has a `SignURL` field: the personal signing link for that recipient. `CreateSignatureReviewLink` also returns a top-level `PreviewURL` for document-level preview.
- **`ResendEmail` takes recipient UUIDs** (`[]string`), not email addresses — fetch them from the send/review response recipients or from `GetAuditTrail`.
- **TurboWebhooks requires an admin TDX- key.** The backend route gate is `requireOrgRole(administrator)` — a non-admin key returns `*turbodocx.AuthorizationError` (HTTP 403). Discriminate with `errors.As`.
- **One webhook per org, fixed name `signature`.** The SDK is hardcoded to `/api/webhooks/signature` to stay in sync with the dashboard's Signature Webhooks page. There is no `ListWebhooks` by design. For multi-webhook management call the REST API directly.
- **Webhook secrets are shown ONCE** — capture `created.Secret` from `CreateWebhook` and `rotated["secret"]` from `RegenerateWebhookSecret` immediately. They are never returned again by `GetWebhook` or any other endpoint.
- **Webhook URLs must be HTTPS.** Non-HTTPS URLs return `*turbodocx.ValidationError` (HTTP 400) from the backend.
- **Read the raw request body in your receiver, not the decoded JSON.** Use `io.ReadAll(r.Body)`. `VerifyWebhookSignature` is computed over the raw bytes; a re-marshal will not match.
- **`VerifyWebhookSignature` is a free function**, not a method on a client — it has no `APIKey` / `OrgID` dependency. Pass `nil` for `opts` to use the default 300-second tolerance.
- **`ConflictError` (HTTP 409)** — returned by `CreateWebhook` when a webhook with the same name already exists for the org. Discriminate it with `errors.As(err, new(*turbodocx.ConflictError))`.
- **TurboQuote decimal fields are `float64`**, not strings — the response normalizer coerces backend string decimals (e.g. `"499.00"`) to `float64` before unmarshalling into `Quote`, `LineItem`, `Product`, etc. Do not expect string values for `unitPrice`, `listPrice`, `grandTotal`, `taxRate`, or any other monetary/percentage field.
- **PATCH null-clears on `UpdateQuoteRequest` require explicit helper calls.** Go omits nil pointer fields by default. To send `"priceBookId": null`, `"validUntil": null`, `"taxRate": null`, or `"renewalPeriod": null`, call the corresponding method (`ClearPriceBookID()`, `ClearValidUntil()`, etc.) on the request before passing it to `UpdateQuote`. Setting the pointer to `nil` alone is not sufficient.
- **`discountType` is `"percent"` or `"amount"`.** Use the typed constants `turbodocx.DiscountTypePercent` and `turbodocx.DiscountTypeAmount` when setting discounts on line items or bundles to avoid silent backend validation errors.
- **Bulk creates are partial-success, not transactional.** `BulkCreateProducts`/`BulkCreatePriceBooks`/`BulkCreateBundles`/`BulkCreateCompanies`/`BulkCreateContacts`/`BulkCreateTypes` return a non-nil `err` only for transport/request-level failures (e.g. exceeding the 500-row cap → 400). A bad row does not error — read `result.Failed` (`[]BulkImportRowIssue{Row, Reason}`, `Row` 1-indexed) and `result.Adjusted`; earlier rows are not rolled back. Admin + contributor keys only.

**Full API reference:** https://docs.turbodocx.com/docs
