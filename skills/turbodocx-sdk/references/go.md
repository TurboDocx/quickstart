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

The download is a **two-step** operation and the SDK performs both for you: `GET /api/signature/:id/download` returns **JSON** (`{"downloadUrl": ..., "fileName": ...}`, not bytes), and the SDK then fetches the presigned `downloadUrl` **with no `Authorization` header** — S3 rejects a presigned request that also carries one. Replicate both steps if you ever call the REST endpoint directly.

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

## Deliverable

Document generation: render a TurboDocx template with variable substitution into a deliverable (DOCX/PPTX), then download it or hand its ID to TurboSign as the source document.

### Configuration

`NewDeliverableClientOnly` does NOT require `SenderEmail` — Deliverable never sends email. `OrgID` is required (the constructor returns an `AuthenticationError` without it); it falls back to `TURBODOCX_ORG_ID` when omitted.

```go
dc, err := turbodocx.NewDeliverableClientOnly(turbodocx.ClientConfig{
    APIKey: os.Getenv("TURBODOCX_API_KEY"),
    OrgID:  os.Getenv("TURBODOCX_ORG_ID"),
})
if err != nil {
    log.Fatal(err)
}
```

The full `NewClientWithConfig` client also exposes `client.Deliverable` alongside `client.TurboSign`.

### GenerateDeliverable

Generate a document from a template with variable substitution. Struct fields are Go-idiomatic, but they serialize to the camelCase JSON keys (`templateId`, `mimeType`) the API expects verbatim.

```go
created, err := dc.GenerateDeliverable(ctx, &turbodocx.CreateDeliverableRequest{
    TemplateID: "template-uuid",
    Name:       "Employee Contract - John Smith",
    Variables: []turbodocx.DeliverableVariable{
        {Placeholder: "{EmployeeName}", Text: "John Smith", MimeType: "text"},
        {Placeholder: "{CompanyName}", Text: "TechCorp Inc.", MimeType: "text"},
        {Placeholder: "{StartDate}", Text: "2026-06-01", MimeType: "text"},
    },
    Description: "Generated via API for HR onboarding", // optional
    Tags:        []string{"hr", "contract"},           // optional
})
if err != nil {
    log.Fatal(err)
}

d := created.Results.Deliverable
fmt.Printf("%s  %s  %s\n", d.ID, d.Name, d.FileType)
```

`MimeType` is one of `"text"`, `"html"`, `"image"`, or `"markdown"`. For repeating content (tables, lists), set `VariableStack` on a `DeliverableVariable`.

### ListDeliverables

```go
list, err := dc.ListDeliverables(ctx, &turbodocx.ListDeliverablesOptions{
    Limit:    20, // 1-100, default 6
    Offset:   0,
    Query:    "contract",
    ShowTags: true,
})
if err != nil {
    log.Fatal(err)
}

fmt.Println(list.TotalRecords)
for _, d := range list.Results {
    fmt.Printf("  %s  %s  %s\n", d.ID, d.Name, d.CreatedOn)
}
```

Pagination uses `Offset`, not a page number.

### GetDeliverableDetails

```go
d, err := dc.GetDeliverableDetails(ctx, deliverableID, &turbodocx.GetDeliverableOptions{ShowTags: true})
if err != nil {
    log.Fatal(err)
}
fmt.Println(d.Name, d.TemplateName, len(d.Variables), d.Tags)
```

Returns a full `*DeliverableRecord` (unwrapped from `results`), including `Variables` and (when `ShowTags` is true) `Tags`.

### UpdateDeliverableInfo

```go
tags := []string{"hr", "contract", "finalized"} // replaces all existing tags
updated, err := dc.UpdateDeliverableInfo(ctx, deliverableID, &turbodocx.UpdateDeliverableRequest{
    Name:        "Employee Contract - John Smith (Final)",
    Description: "Finalized version",
    Tags:        &tags,
})
if err != nil {
    log.Fatal(err)
}
fmt.Println(updated.Message, updated.DeliverableID)
```

`Tags` is a `*[]string`: passing it **replaces** the full tag set. Point it at an empty slice to clear all tags; leave it `nil` to keep the existing tags untouched.

### DeleteDeliverable

```go
deleted, err := dc.DeleteDeliverable(ctx, deliverableID)
if err != nil {
    log.Fatal(err)
}
fmt.Println(deleted.Message) // soft delete — data is retained but hidden from list
```

### DownloadSourceFile / DownloadPDF

Both return raw `[]byte` — write them straight to disk.

```go
docxBytes, err := dc.DownloadSourceFile(ctx, deliverableID)
if err != nil {
    log.Fatal(err)
}
os.WriteFile("contract.docx", docxBytes, 0644)

pdfBytes, err := dc.DownloadPDF(ctx, deliverableID)
if err != nil {
    log.Fatal(err)
}
os.WriteFile("contract.pdf", pdfBytes, 0644)
```

`DownloadSourceFile` returns the original DOCX/PPTX and requires the `hasFileDownload` entitlement.

### Generate, then send for signature

The full client exposes both modules, so you can generate and sign without downloading and re-uploading:

```go
client, err := turbodocx.NewClientWithConfig(turbodocx.ClientConfig{
    APIKey:      os.Getenv("TURBODOCX_API_KEY"),
    OrgID:       os.Getenv("TURBODOCX_ORG_ID"),
    SenderEmail: os.Getenv("TURBODOCX_SENDER_EMAIL"),
})
if err != nil {
    log.Fatal(err)
}

created, err := client.Deliverable.GenerateDeliverable(ctx, &turbodocx.CreateDeliverableRequest{
    TemplateID: "template-uuid",
    Name:       "Consulting Agreement",
    Variables: []turbodocx.DeliverableVariable{
        {Placeholder: "{ClientName}", Text: "Acme Corp", MimeType: "text"},
    },
})
if err != nil {
    log.Fatal(err)
}

_, err = client.TurboSign.SendSignature(ctx, &turbodocx.SendSignatureRequest{
    DeliverableID: created.Results.Deliverable.ID, // no download/re-upload
    DocumentName:  "Consulting Agreement",
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
```

---

## TurboPartner

Partner-portal operations: provision and manage customer organizations, their users, API keys, entitlements, and audit logs. Uses **separate partner credentials**.

### Configuration

```go
partner, err := turbodocx.NewPartnerClient(turbodocx.PartnerConfig{
    PartnerAPIKey: os.Getenv("TURBODOCX_PARTNER_API_KEY"), // starts with TDXP-
    PartnerID:     os.Getenv("TURBODOCX_PARTNER_ID"),      // UUID
})
if err != nil {
    log.Fatal(err)
}
```

### Organization management

```go
// Create
org, err := partner.CreateOrganization(ctx, &turbodocx.CreateOrganizationRequest{
    Name:     "Acme Corp",
    Metadata: map[string]interface{}{"industry": "Technology"},
    Features: &turbodocx.Features{ // optional initial entitlements
        MaxUsers: turbodocx.IntPtr(50),
        HasTDAI:  turbodocx.BoolPtr(true),
    },
})
fmt.Println(org.Data.ID)

// List (uses Limit/Offset, not page)
orgs, _ := partner.ListOrganizations(ctx, &turbodocx.ListOrganizationsRequest{
    Limit:  turbodocx.IntPtr(20),
    Offset: turbodocx.IntPtr(0),
    Search: "acme",
})
fmt.Println(orgs.Data.TotalRecords)
for _, o := range orgs.Data.Results {
    fmt.Println(o.ID, o.Name)
}

// Get details (includes features + tracking)
details, _ := partner.GetOrganizationDetails(ctx, "org-uuid")
fmt.Println(details.Data.Features, details.Data.Tracking)

// Update name
partner.UpdateOrganizationInfo(ctx, "org-uuid", &turbodocx.UpdateOrganizationRequest{Name: "Acme Holdings"})

// Delete
partner.DeleteOrganization(ctx, "org-uuid")

// Update entitlements — Features and Tracking are separate keys
partner.UpdateOrganizationEntitlements(ctx, "org-uuid", &turbodocx.UpdateEntitlementsRequest{
    Features: &turbodocx.Features{
        MaxUsers:      turbodocx.IntPtr(100),
        HasTDAI:       turbodocx.BoolPtr(true),
        HasSalesforce: turbodocx.BoolPtr(true),
    },
    Tracking: &turbodocx.Tracking{NumUsers: 12}, // optional: seed usage counters
})
```

### Organization user management

```go
// List
users, _ := partner.ListOrganizationUsers(ctx, "org-uuid", &turbodocx.ListOrgUsersRequest{
    Limit: turbodocx.IntPtr(25), Offset: turbodocx.IntPtr(0),
})

// Invite — ORG role enum: "admin" | "contributor" | "user" | "viewer"
// ("member" is a PARTNER-portal role and is rejected here with a 400.)
partner.AddUserToOrganization(ctx, "org-uuid", &turbodocx.AddOrgUserRequest{
    Email: "newhire@acme.com", Role: "contributor",
})

// Update role
partner.UpdateOrganizationUserRole(ctx, "org-uuid", "user-uuid", &turbodocx.UpdateOrgUserRequest{Role: "admin"})

// Remove
partner.RemoveUserFromOrganization(ctx, "org-uuid", "user-uuid")

// Resend invitation email
partner.ResendOrganizationInvitationToUser(ctx, "org-uuid", "user-uuid")
```

### Organization API key management

```go
// List
keys, _ := partner.ListOrganizationAPIKeys(ctx, "org-uuid", &turbodocx.ListOrgAPIKeysRequest{Limit: turbodocx.IntPtr(10)})

// Create — the full key value is returned ONLY on creation, store it immediately
// Org API keys use the ORG role enum: "admin" | "contributor" | "user" | "viewer"
created, _ := partner.CreateOrganizationAPIKey(ctx, "org-uuid", &turbodocx.CreateOrgAPIKeyRequest{
    Name: "Production Key", Role: "admin",
})
fmt.Println(created.Data.Key) // capture this once, it won't be shown again

// Update (rename or change role)
partner.UpdateOrganizationAPIKey(ctx, "org-uuid", "key-uuid", &turbodocx.UpdateOrgAPIKeyRequest{Name: "Renamed"})

// Revoke
partner.RevokeOrganizationAPIKey(ctx, "org-uuid", "key-uuid")
```

### Partner API key management

```go
// List
keys, _ := partner.ListPartnerAPIKeys(ctx, &turbodocx.ListPartnerAPIKeysRequest{Limit: turbodocx.IntPtr(10)})

// Create with scopes — full key returned only on creation
created, _ := partner.CreatePartnerAPIKey(ctx, &turbodocx.CreatePartnerAPIKeyRequest{
    Name:        "CI/CD Key",
    Scopes:      []string{turbodocx.ScopeOrgCreate, turbodocx.ScopeOrgRead, turbodocx.ScopeEntitlementsUpdate},
    Description: "Used by GitHub Actions",
})
fmt.Println(created.Data.Key) // store this immediately

// Update name / scopes
partner.UpdatePartnerAPIKey(ctx, "key-uuid", &turbodocx.UpdatePartnerAPIKeyRequest{
    Name:   "CI/CD Key (extended)",
    Scopes: []string{turbodocx.ScopeOrgCreate, turbodocx.ScopeOrgRead, turbodocx.ScopeOrgUpdate, turbodocx.ScopeEntitlementsUpdate},
})

// Revoke
partner.RevokePartnerAPIKey(ctx, "key-uuid")
```

Scope constants (`turbodocx.Scope*`) cover `org:*`, `entitlements:update`, `org-users:*`, `partner-users:*`, `org-apikeys:*`, `partner-apikeys:*`, and `audit:read`.

### Partner-portal user management

```go
// List
users, _ := partner.ListPartnerPortalUsers(ctx, &turbodocx.ListPartnerUsersRequest{Limit: turbodocx.IntPtr(25)})

// Add — PARTNER role enum: "admin" | "member" | "viewer"
// ("contributor" / "user" are ORG roles and are rejected here with a 400.)
// All SEVEN permission fields are required — set every flag explicitly.
partner.AddUserToPartnerPortal(ctx, &turbodocx.AddPartnerUserRequest{
    Email: "admin@partner.com",
    Role:  "admin",
    Permissions: turbodocx.PartnerPermissions{
        CanManageOrgs:           true,
        CanManageOrgUsers:       true,
        CanManagePartnerUsers:   false,
        CanManageOrgAPIKeys:     true,
        CanManagePartnerAPIKeys: false,
        CanUpdateEntitlements:   true,
        CanViewAuditLogs:        true,
    },
})

// Update — the Permissions pointer is optional, but there is NO partial update:
// if it is non-nil the backend requires ALL SEVEN keys. Note that every field of
// PartnerPermissions is a plain bool with no omitempty, so a partially-filled struct
// literal still puts all 7 keys on the wire — the ones you left out go out as `false`,
// silently REVOKING those permissions. Read the current permissions first, then flip
// only what changes.
users, _ := partner.ListPartnerPortalUsers(ctx, &turbodocx.ListPartnerUsersRequest{
    Limit: turbodocx.IntPtr(100),
})
var perms turbodocx.PartnerPermissions
for _, u := range users.Data.Results {
    if u.ID == "user-uuid" && u.Permissions != nil {
        perms = *u.Permissions // all 7 fields, straight from the server
        break
    }
}
perms.CanManageOrgs = true
perms.CanManageOrgUsers = true

partner.UpdatePartnerUserPermissions(ctx, "user-uuid", &turbodocx.UpdatePartnerUserRequest{
    Role:        "member",
    Permissions: &perms,
})

// To change ONLY the role, leave Permissions nil:
partner.UpdatePartnerUserPermissions(ctx, "user-uuid", &turbodocx.UpdatePartnerUserRequest{
    Role: "viewer",
})

// Remove
partner.RemoveUserFromPartnerPortal(ctx, "user-uuid")

// Resend invitation
partner.ResendPartnerPortalInvitationToUser(ctx, "user-uuid")
```

### Audit logs

```go
logs, _ := partner.GetPartnerAuditLogs(ctx, &turbodocx.ListAuditLogsRequest{
    Action:       "org.created",
    ResourceType: "organization",
    StartDate:    "2026-01-01",
    EndDate:      "2026-12-31",
    Success:      turbodocx.BoolPtr(true),
    Limit:        turbodocx.IntPtr(100),
    Offset:       turbodocx.IntPtr(0),
})
fmt.Println(logs.Data.TotalRecords)
for _, entry := range logs.Data.Results {
    fmt.Println(entry.CreatedOn, entry.Action, entry.ResourceID, entry.Success)
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

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the name `signature`) to TurboSign document events. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### Webhook events

TurboSign dispatches **7** events. All of them are live — subscribe to whichever your integration needs.

| Event (wire string) | Fires when |
|---|---|
| `signature.document.sent` | The document is dispatched to recipients |
| `signature.document.viewed` | A recipient opens the document for the first time |
| `signature.document.recipient_signed` | An individual signer completes their signature — fires **once per signer** |
| `signature.document.signed` | A signer signs but the document is **not yet complete** (document-level partial progress) |
| `signature.document.completed` | All recipients have signed and the signed PDF is finalized |
| `signature.document.finalization_failed` | The signed PDF fails to finalize (e.g. KMS signing error); the document is **not** completed |
| `signature.document.voided` | The document is voided or cancelled |

The SDK exposes these as first-class constants — `turbodocx.WebhookEventSent`, `…Viewed`, `…RecipientSigned`, `…Signed`, `…Completed`, `…FinalizationFailed`, `…Voided` — plus `turbodocx.AllWebhookEvents`, a slice of all 7.

**Gotcha:** the constants have the named type `turbodocx.WebhookEvent`, not `string`, so they are **not** directly assignable into `Events []string`. Convert them with `turbodocx.WebhookEventStrings(...)`:

```go
// Typed constants -> []string. Without WebhookEventStrings this will not compile.
Events: turbodocx.WebhookEventStrings(
    turbodocx.WebhookEventRecipientSigned,
    turbodocx.WebhookEventCompleted,
    turbodocx.WebhookEventVoided,
)

// All 7 at once:
Events: turbodocx.WebhookEventStrings(turbodocx.AllWebhookEvents...)
```

The literal wire strings above are what actually travel in the `eventType` field of the delivered payload, and they are always accepted by `CreateWebhook`/`UpdateWebhook`. `GetWebhook` also returns an `availableEvents` array — the backend advertises the live catalog at runtime.

#### Lifecycle: `recipient_signed` vs `signed` vs `completed`

This is the part integrations get wrong. On **every** signature, `recipient_signed` fires first. Then exactly one of `signed`, `completed`, or `finalization_failed` follows:

```
Recipient signs
   │
   ├─ signature.document.recipient_signed   (always — one per signer)
   │
   └─ more signers remaining?
        ├─ yes → signature.document.signed                 (partial progress)
        └─ no  → signature.document.completed              (finalized OK)
                 or signature.document.finalization_failed (finalization failed)
```

- **`recipient_signed`** is the **per-person** event. It fires once for every signer, *including the last one*, and carries the signer's identity plus `is_final_signer` (true only on the last signature) and `remaining_signers`.
- **`signed`** is a **document-level partial-progress** event. It fires **only when a signer signs and the document is NOT yet complete**.
- **`signed` never fires on the final signature.** To detect "the whole document is done", use `completed` (or `recipient_signed` with `is_final_signer: true`) — **never** `signed`.
- **A single-signer document never emits `signed` at all.** It emits `recipient_signed` (`is_final_signer: true`) and then `completed`.

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
    URLs: []string{"https://your-server.example.com/webhooks/turbodocx"}, // 1-10, HTTPS only
    Events: []string{ // at least 1
        "signature.document.sent",
        "signature.document.viewed",
        "signature.document.recipient_signed",    // once per signer; carries is_final_signer
        "signature.document.completed",           // the ONLY reliable "document is done" signal
        "signature.document.finalization_failed",
        "signature.document.voided",
        // "signature.document.signed",           // add only if you want partial-progress pings;
        //                                        // it never fires on the final signature
    },
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("id: %s\n", created.ID)
fmt.Printf("secret: %s\n", created.Secret) // shown ONCE — save immediately
```

`URLs` must contain **1–10** HTTPS URLs and `Events` at least **1** event, or the backend returns a 400 `*turbodocx.ValidationError`. Webhook management requires an **administrator** API key.

### GetWebhook

Returns the webhook record plus aggregate `deliveryStats` and the server-provided event catalog. The shape is returned as `map[string]interface{}` so new fields surface without an SDK upgrade.

```go
webhook, err := wh.GetWebhook(ctx)
```

### UpdateWebhook

Patch any subset of fields. Use `turbodocx.BoolPtr(false)` to toggle `IsActive`.

```go
updated, err := wh.UpdateWebhook(ctx, turbodocx.UpdateWebhookRequest{
    URLs:     []string{"https://new-server.example.com/hook"}, // 1-10 HTTPS URLs
    IsActive: turbodocx.BoolPtr(false),
})

// To pause deliveries without touching the routing, leave URLs/Events nil:
wh.UpdateWebhook(ctx, turbodocx.UpdateWebhookRequest{IsActive: turbodocx.BoolPtr(false)})
```

The fields are optional, but **optional does not mean "may be empty"**: if `URLs` is present it still has to hold 1–10 URLs, and if `Events` is present it still has to hold at least 1. Sending an empty slice is a 400 — leave the field nil so it is omitted entirely.

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
termDays := 365 // optional; DEFAULT IS 60. Max 3650 (10 years). -1 = auto-renewal.
quote, err := qc.CreateQuote(ctx, &turbodocx.CreateQuoteRequest{
    Name:      "Acme Annual Subscription",
    CompanyID: companyID,
    ContactID: contactID,
    TermDays:  &termDays,
})
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Quote ID: %s  Number: %s\n", quote.ID, quote.QuoteNumber)
// quote.Status == "draft"
```

**`TermDays` / `RenewalPeriod`** — `TermDays` defaults to **60** when nil, and may be any int up to **3650**, or the sentinel **`-1`** meaning auto-renewal. The two fields are coupled:

- `TermDays == -1` → `RenewalPeriod` is **required** (`"weekly" | "monthly" | "quarterly" | "annually"`).
- any other `TermDays` → `RenewalPeriod` must be **nil**; sending it is a 400.

```go
// Auto-renewing quote — RenewalPeriod is mandatory
autoRenew, period := -1, "monthly"
qc.CreateQuote(ctx, &turbodocx.CreateQuoteRequest{
    Name:          "Managed Services - auto-renew",
    CompanyID:     companyID,
    ContactID:     contactID,
    TermDays:      &autoRenew,
    RenewalPeriod: &period,
})

// Fixed-term quote — leave RenewalPeriod nil
fixed := 90
qc.CreateQuote(ctx, &turbodocx.CreateQuoteRequest{
    Name:      "Fixed 90-day engagement",
    CompanyID: companyID,
    ContactID: contactID,
    TermDays:  &fixed,
})
```

On `UpdateQuote`, use `ClearRenewalPeriod()` to explicitly null the field out when moving a quote off auto-renewal — a nil pointer alone is omitted from the PATCH body and leaves the old value in place.

### AddLineItems / AddBundleLineItems

`AddLineItems` is variadic — pass one struct or many; both routes send an array to the backend. The array is capped at **50 items** per call (`Reorder` allows up to 200).

`ProductID`, `ProductName`, `UnitPrice`, and `BillingFrequency` are all **required** by the API. `ProductID` is deliberately declared without `omitempty`, so the key is always on the wire: a non-nil pointer references a catalog product, and a **nil pointer sends `"productId": null`**, which is how you add an ad-hoc item with no catalog product behind it. `Quantity` defaults to 1.

```go
qty := 3
productID := "product-uuid"
items, err := qc.AddLineItems(ctx, quote.ID, turbodocx.AddLineItemRequest{
    ProductID:        &productID,  // REQUIRED key; nil sends null for an ad-hoc item
    ProductName:      "Professional License", // REQUIRED
    UnitPrice:        499.00,                 // REQUIRED
    BillingFrequency: "annual",               // REQUIRED
    Quantity:         &qty,                   // optional, defaults to 1
})
if err != nil {
    log.Fatal(err)
}
// Returns []LineItem — unitPrice, listPrice etc. are float64 (normalizer coerces strings)

// Ad-hoc item with no catalog product: leave ProductID nil (it still marshals as null).
setupQty := 1
qc.AddLineItems(ctx, quote.ID, turbodocx.AddLineItemRequest{
    ProductID:        nil,
    ProductName:      "Setup Fee",
    UnitPrice:        1500.00,
    BillingFrequency: "one-time",
    Quantity:         &setupQty,
})

// Add a bundle instead — BundleID and BundleName are both required. The server expands
// the bundle's child products itself; you never send them.
bundleItems, err := qc.AddBundleLineItems(ctx, quote.ID, turbodocx.AddBundleLineItemRequest{
    BundleID:   bundleID,         // REQUIRED
    BundleName: "Starter Bundle", // REQUIRED
    Quantity:   &qty,
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

### HandleExpiredQuote

Act on a sent quote whose `validUntil` has passed. **`Action` accepts exactly two values: `"void"` and `"decline"`.** There is no `"extend"` and no `"resend"` — those are not implemented and return a 400. `Reason` (max 190 chars) and `NewValidUntil` (ISO date) are **both required**.

The endpoint voids/declines the original quote and creates a duplicate carrying the new `validUntil` date — that duplicate is how you "extend" an expired quote.

```go
result, err := qc.HandleExpiredQuote(ctx, quote.ID, &turbodocx.HandleExpiredQuoteRequest{
    Action:        "void",                     // "void" | "decline" — nothing else
    Reason:        "Pricing refreshed for Q4", // REQUIRED, max 190 chars
    NewValidUntil: "2026-12-31",               // REQUIRED, ISO date — carried by the new duplicate
})
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

// Create a product.
// Name, ListPrice, BillingFrequency and CategoryID are all REQUIRED.
// CategoryID is a real UUID — get it from a CreateType with CategoryType "product_category".
product, err := qc.CreateProduct(ctx, &turbodocx.CreateProductRequest{
    Name:             "Enterprise Add-on",
    ListPrice:        799.00,
    BillingFrequency: "annual",
    CategoryID:       categoryID,
    // Images: []turbodocx.ProductImageInput{...},  // MAX 5 images per product, MAX 2 MB each
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
        // ProductID is nil here — an ad-hoc item. The key still marshals as null,
        // which is what the API requires; ProductName/UnitPrice/BillingFrequency are mandatory.
        {ProductID: nil, ProductName: "Starter Plan", UnitPrice: 99.00, BillingFrequency: "monthly"},
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

Every product row requires `Name`, `CategoryID`, `ListPrice`, and `BillingFrequency`. **`CategoryID` must be a real category UUID** — there is no category-by-name convenience field on the bulk row, and because the backend rejects unknown keys a `categoryName` field would 400 the row. Resolve (or create) the category first and pass its UUID:

```go
// 1. Resolve the category UUID once — create it if it doesn't exist yet.
var categoryID string
types, err := qc.ListTypes(ctx, nil)
for _, t := range types.Results {
    if t.Name == "Subscriptions" && t.CategoryType == "product_category" {
        categoryID = t.ID
        break
    }
}
if categoryID == "" {
    created, err := qc.CreateType(ctx, &turbodocx.CreateQuoteTypeRequest{
        Name:         "Subscriptions",
        CategoryType: "product_category",
    })
    if err != nil {
        log.Fatal(err)
    }
    categoryID = created.ID
}

// 2. Reference it by UUID on every row.
result, err := qc.BulkCreateProducts(ctx, []turbodocx.CreateProductRequest{
    {Name: "Basic Plan",   ListPrice: 10,  BillingFrequency: "monthly", CategoryID: categoryID},
    {Name: "Premium Plan", ListPrice: 100, BillingFrequency: "monthly", CategoryID: categoryID},
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
- **Rows are validated against the strict backend schema and unknown keys are rejected.** For products the required row fields are exactly `Name`, `CategoryID` (UUID), `ListPrice`, `BillingFrequency` — there is no category-by-name shortcut.
- **Roles** — available to administrator and contributor API keys.

### Quote templates (auto-provisioned — get, then update)

Quote templates are **provisioned for you**. `GET /v1/quote-template` self-heals: if the org has no template it creates one from the org's branding and returns it. Consequences:

- **Never call `CreateTemplate` on an established org** — a template already exists, so it returns 400 `TEMPLATE_ALREADY_EXISTS`. The method is effectively unreachable. Do not write get-then-create-if-missing logic.
- **`DeleteTemplate` is really "reset to org branding defaults"** — it soft-deletes, and the very next `GetTemplate` regenerates one.

The correct flow is always **`GetTemplate` → `UpdateTemplate`**:

```go
template, err := qc.GetTemplate(ctx) // always returns one; creates it if needed
if err != nil {
    log.Fatal(err)
}
primaryColor := "#0B5FFF"
updated, err := qc.UpdateTemplate(ctx, template.ID, &turbodocx.UpdateQuoteTemplateRequest{
    PrimaryColor: &primaryColor,
})
```

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
| `turbodocx.NewDeliverableClientOnly(cfg)` | Construct a Deliverable client (no SenderEmail required) |
| `dc.GenerateDeliverable(ctx, req)` | Render a template with variables into a new deliverable |
| `dc.ListDeliverables(ctx, opts)` | Paginated list with search and tag filters |
| `dc.GetDeliverableDetails(ctx, id, opts)` | Get full record including variables and fonts |
| `dc.UpdateDeliverableInfo(ctx, id, req)` | Update name, description, or tags (tags replace) |
| `dc.DeleteDeliverable(ctx, id)` | Soft-delete (data retained, hidden from list) |
| `dc.DownloadSourceFile(ctx, id)` | Download original DOCX/PPTX as []byte |
| `dc.DownloadPDF(ctx, id)` | Download rendered PDF as []byte |
| `turbodocx.NewPartnerClient(cfg)` | Construct a partner client (PartnerAPIKey, PartnerID) |
| `partner.CreateOrganization(ctx, req)` | Provision a new customer org |
| `partner.ListOrganizations(ctx, req)` | List managed orgs (uses Limit/Offset, not page) |
| `partner.GetOrganizationDetails(ctx, id)` | Get org details including features + tracking |
| `partner.UpdateOrganizationInfo(ctx, id, req)` | Rename an org |
| `partner.DeleteOrganization(ctx, id)` | Delete an org |
| `partner.UpdateOrganizationEntitlements(ctx, id, req)` | Update features and/or tracking |
| `partner.ListOrganizationUsers(ctx, id, req)` | Paginated org-user list |
| `partner.AddUserToOrganization(ctx, id, req)` | Invite a user with an ORG role (`admin` \| `contributor` \| `user` \| `viewer`) |
| `partner.UpdateOrganizationUserRole(ctx, id, userID, req)` | Change a user's role |
| `partner.RemoveUserFromOrganization(ctx, id, userID)` | Remove user from org |
| `partner.ResendOrganizationInvitationToUser(ctx, id, userID)` | Resend invite email |
| `partner.ListOrganizationAPIKeys(ctx, id, req)` | Paginated org API-key list |
| `partner.CreateOrganizationAPIKey(ctx, id, req)` | Create org key (value returned only on creation) |
| `partner.UpdateOrganizationAPIKey(ctx, id, keyID, req)` | Rename or change role |
| `partner.RevokeOrganizationAPIKey(ctx, id, keyID)` | Revoke org key |
| `partner.ListPartnerAPIKeys(ctx, req)` | Paginated partner API-key list |
| `partner.CreatePartnerAPIKey(ctx, req)` | Create partner key with scopes |
| `partner.UpdatePartnerAPIKey(ctx, keyID, req)` | Rename, edit scopes |
| `partner.RevokePartnerAPIKey(ctx, keyID)` | Revoke partner key |
| `partner.ListPartnerPortalUsers(ctx, req)` | Paginated partner-portal user list |
| `partner.AddUserToPartnerPortal(ctx, req)` | Invite with a PARTNER role (`admin` \| `member` \| `viewer`) + all 7 permission fields |
| `partner.UpdatePartnerUserPermissions(ctx, userID, req)` | Update role and/or permissions. `Permissions` is optional, but if non-nil the backend requires **all 7 keys** — there is no partial update |
| `partner.RemoveUserFromPartnerPortal(ctx, userID)` | Remove partner-portal user |
| `partner.ResendPartnerPortalInvitationToUser(ctx, userID)` | Resend invite email |
| `partner.GetPartnerAuditLogs(ctx, req)` | Filter audit logs by action/resource/date/success |
| `turbodocx.NewWebhooksClientWithConfig(cfg)` | Construct an admin-scoped webhook client (no SenderEmail required) |
| `wh.CreateWebhook(ctx, req)` | Subscribe the org to events. `URLs`: 1–10 HTTPS URLs; `Events`: at least 1. Requires an **administrator** API key |
| `wh.GetWebhook(ctx)` | Get the org's signature webhook + delivery stats |
| `wh.UpdateWebhook(ctx, req)` | Patch URLs / events / isActive. Fields are optional, but a non-nil `URLs`/`Events` still has to be non-empty (an empty slice is a 400) |
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
| `qc.HandleExpiredQuote(ctx, id, req)` | Void or decline an expired sent quote and re-issue it as a duplicate. `Action` is `"void"` \| `"decline"` only; `Reason` (max 190) and `NewValidUntil` (ISO date) are both required |
| `qc.CreateAndSend(ctx, req)` | Convenience: create + add items + send in one call |
| `qc.GetQuoteNumberConfig(ctx)` | Get the org's quote-number config (admin; `{ format, currentFloor }`) |
| `qc.UpdateQuoteNumberConfig(ctx, format)` | Update the org's quote-number format (admin; returns `{ format, currentFloor }`) |
| `qc.ListLineItems(ctx, quoteID, opts)` | List line items for a quote |
| `qc.AddLineItems(ctx, quoteID, items...)` | Add 1–50 product line items (variadic). `ProductID` (key; nil sends null), `ProductName`, `UnitPrice`, `BillingFrequency` all required |
| `qc.AddBundleLineItems(ctx, quoteID, items...)` | Add 1–50 bundle line items (variadic); each needs only `BundleID` + `BundleName` (the server expands the children) |
| `qc.UpdateLineItem(ctx, quoteID, itemID, req)` | Update a line item |
| `qc.RemoveLineItem(ctx, quoteID, itemID)` | Remove a line item |
| `qc.ListProducts(ctx, opts)` | Paginated product catalog |
| `qc.CreateProduct(ctx, req)` | Create a product; `CategoryID` required (multipart when images provided — max 5 images, 2 MB each) |
| `qc.BulkCreateProducts(ctx, rows)` | Bulk-import products; each row needs `Name`, `CategoryID` (UUID), `ListPrice`, `BillingFrequency`. Returns `(*BulkImportResult, error)` (partial success) |
| `qc.GetProduct(ctx, id)` | Get a product by ID |
| `qc.UpdateProduct(ctx, id, req)` | Update a product (multipart when images provided — max 5 images, 2 MB each) |
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
| `qc.GetTemplate(ctx)` | Get the active (singleton) quote template. Self-heals: auto-creates one from org branding if none exists, so it always returns a template |
| `qc.GetTemplateByID(ctx, id)` | Get a specific quote template by ID |
| `qc.CreateTemplate(ctx, req)` | Effectively unreachable — the template is auto-provisioned, so this returns 400 `TEMPLATE_ALREADY_EXISTS` on any established org. Use `GetTemplate` → `UpdateTemplate` |
| `qc.UpdateTemplate(ctx, id, req)` | Update a quote template — this is how you customize it |
| `qc.DeleteTemplate(ctx, id)` | Reset to org branding defaults (soft-delete; the next `GetTemplate` regenerates one) |
| `qc.ListTypes(ctx, opts)` | Paginated quote types/categories list |
| `qc.CreateType(ctx, req)` | Create a quote type/category |
| `qc.BulkCreateTypes(ctx, rows)` | Bulk-import types/categories; returns `(*BulkImportResult, error)` (partial success) |
| `qc.UpdateType(ctx, id, req)` | Update a quote type/category |
| `qc.DeleteType(ctx, id)` | Delete a quote type/category |

## Gotchas

- **Go SDK uses instance methods**, not static methods — create a client first with `NewClientWithConfig`
- **`SenderEmail` is required** in ClientConfig for TurboSign operations
- **Context is required** for all API calls — pass `context.Background()` or request context
- **Helper functions** `turbodocx.IntPtr()` and `turbodocx.BoolPtr()` for optional pointer fields. There is **no** exported `StringPtr` — take the address of a local variable (`s := "x"; &s`) for `*string` fields.
- **File input** accepts: `[]byte`, file path string, or URL string
- **`SignURL`** — each `Recipient` in the `SendSignature`/`CreateSignatureReviewLink` response has a `SignURL` field: the personal signing link for that recipient. `CreateSignatureReviewLink` also returns a top-level `PreviewURL` for document-level preview.
- **`ResendEmail` takes recipient UUIDs** (`[]string`), not email addresses — fetch them from the send/review response recipients or from `GetAuditTrail`.
- **`Download` is a two-step operation.** `GET /api/signature/:id/download` returns JSON `{"downloadUrl", "fileName"}` — not bytes — and the presigned `downloadUrl` must then be fetched **without an `Authorization` header** (S3 rejects a presigned request that also carries one). The SDK does both steps for you; hand-rolled REST calls must too.
- **Two different role enums — do not mix them.** Organization users and organization API keys take `"admin" | "contributor" | "user" | "viewer"`. Partner-portal users take `"admin" | "member" | "viewer"`. `"member"` is not a valid org role, and `"contributor"` / `"user"` are not valid partner roles — either mistake is a 400.
- **Partner `Permissions` has no partial update.** The pointer is optional on `UpdatePartnerUserRequest`, but every key inside the object is required by the backend, so a non-nil `Permissions` must carry **all seven** flags: `CanManageOrgs`, `CanManageOrgUsers`, `CanManagePartnerUsers`, `CanManageOrgAPIKeys`, `CanManagePartnerAPIKeys`, `CanUpdateEntitlements`, `CanViewAuditLogs`. Every field is a plain `bool` with no `omitempty`, so a partially-filled struct literal still marshals all 7 keys and sends `false` for the ones you skipped — **silently revoking those permissions**. Read the user's current `Permissions` and flip only what changes; to update just the role, leave `Permissions` nil.
- **`UpdateOrganizationEntitlements` takes `Features` and `Tracking` — the two key sets are not interchangeable.** `Features` holds capability/limit columns (`maxUsers`, `maxStorage`, `maxAPIKeys`, `hasTDAI`, …); `Tracking` holds usage counters, which use the `num*` names: `numUsers`, `numProjectspaces`, `numTemplates`, `storageUsed`, `numGeneratedDeliverables`, `numSignaturesUsed`, `numQuotesSent`, `currentAICredits`. A `maxUsers` key inside `Tracking` is rejected. `currentAICredits` accepts `-1` (unlimited); every other counter floors at 0.
- **TurboWebhooks requires an admin TDX- key.** The backend route gate is `requireOrgRole(administrator)` — a non-admin key returns `*turbodocx.AuthorizationError` (HTTP 403). Discriminate with `errors.As`.
- **One webhook per org, fixed name `signature`.** The SDK is hardcoded to `/api/webhooks/signature` to stay in sync with the dashboard's Signature Webhooks page. There is no `ListWebhooks` by design. For multi-webhook management call the REST API directly.
- **Webhook secrets are shown ONCE** — capture `created.Secret` from `CreateWebhook` and `rotated["secret"]` from `RegenerateWebhookSecret` immediately. They are never returned again by `GetWebhook` or any other endpoint.
- **Webhook URLs must be HTTPS.** Non-HTTPS URLs return `*turbodocx.ValidationError` (HTTP 400) from the backend.
- **`URLs` is 1–10, `Events` is 1+ — on create AND on update.** Both are optional on `UpdateWebhookRequest`, but optional does not relax the minimum: sending an empty slice is a 400. To leave routing alone, leave the field nil so it is omitted entirely. Webhook management requires an **administrator** API key.
- **Read the raw request body in your receiver, not the decoded JSON.** Use `io.ReadAll(r.Body)`. `VerifyWebhookSignature` is computed over the raw bytes; a re-marshal will not match.
- **`VerifyWebhookSignature` is a free function**, not a method on a client — it has no `APIKey` / `OrgID` dependency. Pass `nil` for `opts` to use the default 300-second tolerance.
- **`ConflictError` (HTTP 409)** — returned by `CreateWebhook` when a webhook with the same name already exists for the org. Discriminate it with `errors.As(err, new(*turbodocx.ConflictError))`.
- **TurboQuote decimal fields are `float64`**, not strings — the response normalizer coerces backend string decimals (e.g. `"499.00"`) to `float64` before unmarshalling into `Quote`, `LineItem`, `Product`, etc. Do not expect string values for `unitPrice`, `listPrice`, `grandTotal`, `taxRate`, or any other monetary/percentage field.
- **PATCH null-clears on `UpdateQuoteRequest` require explicit helper calls.** Go omits nil pointer fields by default. To send `"priceBookId": null`, `"validUntil": null`, `"taxRate": null`, or `"renewalPeriod": null`, call the corresponding method (`ClearPriceBookID()`, `ClearValidUntil()`, etc.) on the request before passing it to `UpdateQuote`. Setting the pointer to `nil` alone is not sufficient.
- **`discountType` is `"percent"` or `"amount"`.** Use the typed constants `turbodocx.DiscountTypePercent` and `turbodocx.DiscountTypeAmount` when setting discounts on line items or bundles to avoid silent backend validation errors.
- **Every product line item needs four fields: `ProductID`, `ProductName`, `UnitPrice`, `BillingFrequency`.** `ProductID` is a `*string` declared **without** `omitempty` on purpose: the key is always on the wire, and a nil pointer marshals as `"productId": null` — that is how you add a custom, non-catalog item. `Quantity` defaults to 1.
- **Three distinct bundle shapes — don't conflate them.** `CreateBundle`'s `Items` (catalog bundle contents) need `ProductID`, `UnitPrice`, `BillingFrequency` and nothing else — no product name. `AddBundleLineItems` (attaching a bundle to a quote) needs only `BundleID` + `BundleName`; the server expands the child products for you.
- **Line-item array limits: `AddLineItems` and `AddBundleLineItems` accept 1–50 items per call; reorder accepts up to 200.** Chunk larger imports.
- **`TermDays` defaults to 60** (not 30), maxes out at 3650, and `-1` means auto-renewal. `RenewalPeriod` (`"weekly" | "monthly" | "quarterly" | "annually"`) is **required when `TermDays` is -1** and must be absent for any other `TermDays` — sending it otherwise is a 400. Use `ClearRenewalPeriod()` on `UpdateQuoteRequest` when moving a quote off auto-renewal.
- **`HandleExpiredQuote` only accepts `Action: "void"` or `"decline"`.** `"extend"` and `"resend"` do not exist in the API and return a 400. `Reason` (max 190 chars) and `NewValidUntil` (ISO date) are both required; the endpoint voids/declines the original and issues a duplicate carrying the new date — that duplicate *is* the "extend".
- **Quote templates are auto-provisioned.** `GetTemplate` self-heals — it creates one from org branding when none exists — so `CreateTemplate` on an established org returns 400 `TEMPLATE_ALREADY_EXISTS` and is effectively unreachable. Always do `GetTemplate` → `UpdateTemplate`. `DeleteTemplate` is a reset-to-branding-defaults, not a permanent removal.
- **Product images: max 5 per product, 2 MB each.** Exceeding either returns 400 `MAX_IMAGES_EXCEEDED`.
- **Bulk creates are partial-success, not transactional.** `BulkCreateProducts`/`BulkCreatePriceBooks`/`BulkCreateBundles`/`BulkCreateCompanies`/`BulkCreateContacts`/`BulkCreateTypes` return a non-nil `err` only for transport/request-level failures (e.g. exceeding the 500-row cap → 400). A bad row does not error — read `result.Failed` (`[]BulkImportRowIssue{Row, Reason}`, `Row` 1-indexed) and `result.Adjusted`; earlier rows are not rolled back. Admin + contributor keys only.
- **Bulk product rows take `CategoryID`, never a category name.** The row schema is strict and rejects unknown keys. Resolve or create the category with `ListTypes` / `CreateType` first and pass its UUID. Required per row: `Name`, `CategoryID`, `ListPrice`, `BillingFrequency`.

**Full API reference:** https://docs.turbodocx.com/docs
