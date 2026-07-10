# Ruby SDK Reference

## Install

```bash
gem install turbodocx-sdk
```

Or add it to your `Gemfile` and install with Bundler:

```ruby
# Gemfile
gem "turbodocx-sdk"
```

```bash
bundle install
```

The gem has **zero runtime dependencies** — it uses only the Ruby standard library (`net/http`, `json`, `openssl`). Ruby 2.7+ is required.

For loading credentials from a `.env` file, the optional `dotenv` gem is convenient (add `gem "dotenv"` and call `Dotenv.load` at boot); it is not required — the SDK reads plain `ENV` values.

## Imports

```ruby
require "turbodocx_sdk"
```

Everything lives under the `TurboDocxSdk` module. The five product modules are:

```ruby
TurboDocxSdk::TurboSign      # digital signatures
TurboDocxSdk::Deliverable    # template-based document generation
TurboDocxSdk::TurboPartner   # partner-portal provisioning
TurboDocxSdk::TurboWebhooks  # signature event subscriptions
TurboDocxSdk::TurboQuote     # sales quotes / CPQ
```

Each module uses a **static class pattern** — call `configure` once, then call class methods. No instantiation.

> **KEY GOTCHA — method args are snake_case, request-hash keys stay camelCase.** Method names and keyword arguments follow Ruby convention (`send_signature`, `api_key:`, `sender_email:`). But the **keys inside a request hash are forwarded to the API verbatim** and must stay **camelCase** (`documentName`, `signingOrder`, `recipientEmail`, `companyId`, `billingFrequency`, …). The SDK does **not** snake→camel-convert payload keys — a hash written with `document_name:` silently drops the value.

---

## TurboSign

Digital signature operations: prepare, send, track, download, void, resend, and audit-trail signed PDFs.

### TurboSign.configure

```ruby
TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],
  org_id:       ENV["TURBODOCX_ORG_ID"],
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"],  # REQUIRED
  sender_name:  ENV["TURBODOCX_SENDER_NAME"]    # optional but recommended
)
```

`sender_email` is **required** — without it a `TurboDocxSdk::ValidationError` is raised. `sender_name` is optional (defaults to a generic API sender). An optional `base_url:` overrides the API host.

### TurboSign.create_signature_review_link

Upload a document with recipients and fields, but **do not send emails** — useful for previewing field placement. Accepts the same request hash as `send_signature`.

```ruby
review = TurboDocxSdk::TurboSign.create_signature_review_link(
  fileLink: "https://example.com/contract.pdf",  # camelCase key
  documentName: "NDA - Acme",
  recipients: [
    { name: "John Doe", email: "john@example.com", signingOrder: 1 }
  ],
  fields: [
    { type: "signature", page: 1, x: 100, y: 500, width: 200, height: 50, recipientEmail: "john@example.com" }
  ]
)

puts review["documentId"]
puts review["previewUrl"]  # open this URL to review the document
review["recipients"].each { |r| puts "#{r['name']}: #{r['signUrl']}" }
```

### TurboSign.send_signature

Upload a document with recipients and fields, and immediately email signature requests. The document source can be `fileLink:` (remote URL), `file:` (raw bytes via `File.binread(...)` or a local path string — file type detected from magic bytes), `deliverableId:`, or `templateId:`.

```ruby
result = TurboDocxSdk::TurboSign.send_signature(
  fileLink: "https://example.com/contract.pdf",
  documentName: "Partnership Agreement",
  recipients: [
    { name: "Alice", email: "alice@example.com", signingOrder: 1 },
    { name: "Bob",   email: "bob@example.com",   signingOrder: 2 }
  ],
  fields: [
    { type: "signature", page: 1, x: 100, y: 500, width: 200, height: 50, recipientEmail: "alice@example.com" },
    { type: "signature", page: 1, x: 100, y: 600, width: 200, height: 50, recipientEmail: "bob@example.com" }
  ]
)

puts result["documentId"]
result["recipients"].each { |r| puts "#{r['name']}: #{r['signUrl']}" }
```

Fields support either coordinate-based placement (`page` + `x`/`y`/`width`/`height`) or anchor-based placement via `template: { anchor: "{signature1}", placement: "replace", size: { width: 100, height: 30 } }`. The anchor text must literally exist in the document.

### TurboSign.get_status

```ruby
status = TurboDocxSdk::TurboSign.get_status("doc-uuid")
puts status["status"]  # "pending" | "completed" | "voided"
status["recipients"].each { |r| puts "#{r['name']}: #{r['status']}" }
```

### TurboSign.download

Downloads the signed document as raw bytes — write them straight to disk with `File.binwrite`.

```ruby
pdf_bytes = TurboDocxSdk::TurboSign.download("doc-uuid")
File.binwrite("signed-contract.pdf", pdf_bytes)
```

### TurboSign.void_document

```ruby
TurboDocxSdk::TurboSign.void_document("doc-uuid", "Counterparty requested changes")
```

The `reason` (second argument) is **required**.

### TurboSign.resend_email

```ruby
# recipient_ids are UUIDs — fetch them from the send/review response or get_audit_trail
TurboDocxSdk::TurboSign.resend_email("doc-uuid", ["recipient-uuid-1", "recipient-uuid-2"])
```

The second argument is an array of recipient **UUIDs**, not email addresses.

### TurboSign.get_audit_trail

```ruby
audit = TurboDocxSdk::TurboSign.get_audit_trail("doc-uuid")
puts audit["document"]["name"]

audit["auditTrail"].each do |entry|
  puts "#{entry['actionType']} at #{entry['timestamp']}"
  puts "  By: #{entry['user']['email']}" if entry["user"]
end
```

The audit trail includes a cryptographic hash chain for tamper-evidence.

---

## Deliverable

Document generation: render a TurboDocx template with variable substitution into a deliverable (DOCX/PPTX), then download it or hand its ID to TurboSign as the source document.

### Deliverable.configure

```ruby
TurboDocxSdk::Deliverable.configure(
  api_key: ENV["TURBODOCX_API_KEY"],  # REQUIRED (or access_token:)
  org_id:  ENV["TURBODOCX_ORG_ID"]    # REQUIRED
)
```

No `sender_email` needed — Deliverable never sends email.

### Deliverable.generate_deliverable

Request-hash keys are camelCase (`templateId`).

```ruby
result = TurboDocxSdk::Deliverable.generate_deliverable(
  "templateId" => "template-uuid",
  "name"       => "Q3 Statement of Work",
  "variables"  => [
    { "placeholder" => "{ClientName}", "text" => "Acme Corp" },
    { "placeholder" => "{StartDate}",  "text" => "2026-08-01" }
  ],
  "description" => "SOW for Acme",   # optional
  "tags"        => ["sow", "acme"]   # optional
)

deliverable = result["results"]["deliverable"]
puts deliverable["id"]
```

You can pass `deliverable["id"]` straight to `TurboSign.send_signature(deliverableId: ...)` to generate-then-sign in one workflow.

### Deliverable.list_deliverables

```ruby
page = TurboDocxSdk::Deliverable.list_deliverables(limit: 25, offset: 0, query: "sow", show_tags: true)
puts page["totalRecords"]
page["results"].each { |d| puts d["name"] }
```

Pagination uses `offset:`, not `page:`.

### Deliverable.get_deliverable_details

```ruby
deliverable = TurboDocxSdk::Deliverable.get_deliverable_details("deliverable-uuid", show_tags: true)
puts deliverable["name"]
```

### Deliverable.update_deliverable_info

```ruby
TurboDocxSdk::Deliverable.update_deliverable_info("deliverable-uuid",
  "name"        => "Q3 SOW (final)",
  "description" => "Signed-off version",
  "tags"        => ["sow", "acme", "final"]  # replaces the full tag set
)
```

Passing `tags` **replaces** all existing tags. Fetch existing tags first if you want to add one.

### Deliverable.delete_deliverable

```ruby
TurboDocxSdk::Deliverable.delete_deliverable("deliverable-uuid")  # soft delete
```

### Deliverable.download_source_file / download_pdf

Both return raw bytes.

```ruby
docx_bytes = TurboDocxSdk::Deliverable.download_source_file("deliverable-uuid")
File.binwrite("sow.docx", docx_bytes)

pdf_bytes = TurboDocxSdk::Deliverable.download_pdf("deliverable-uuid")
File.binwrite("sow.pdf", pdf_bytes)
```

### Generate, then send for signature

```ruby
result = TurboDocxSdk::Deliverable.generate_deliverable(
  "templateId" => "template-uuid",
  "name"       => "Consulting Agreement",
  "variables"  => [{ "placeholder" => "{ClientName}", "text" => "Acme Corp" }]
)

TurboDocxSdk::TurboSign.send_signature(
  deliverableId: result["results"]["deliverable"]["id"],  # no download/re-upload
  recipients: [{ name: "John Doe", email: "john@example.com", signingOrder: 1 }],
  fields: [
    { type: "signature", recipientEmail: "john@example.com",
      template: { anchor: "{signature1}", placement: "replace", size: { width: 100, height: 30 } } }
  ]
)
```

---

## TurboPartner

Partner-portal operations: provision and manage customer organizations, their users, API keys, entitlements, and audit logs. Uses **separate partner credentials**.

### TurboPartner.configure

```ruby
TurboDocxSdk::TurboPartner.configure(
  partner_api_key: ENV["TURBODOCX_PARTNER_API_KEY"],  # starts with TDXP-
  partner_id:      ENV["TURBODOCX_PARTNER_ID"]        # UUID
)
```

### Organization management

```ruby
org = TurboDocxSdk::TurboPartner.create_organization(
  name:     "Acme Corp",
  features: { maxUsers: 50, hasTDAI: true }  # camelCase keys inside the hash
)
puts org["data"]["id"]

orgs    = TurboDocxSdk::TurboPartner.list_organizations(limit: 10, search: "acme")  # uses limit/offset, not page
details = TurboDocxSdk::TurboPartner.get_organization_details("org-uuid")
TurboDocxSdk::TurboPartner.update_organization_info("org-uuid", name: "Acme Holdings")
TurboDocxSdk::TurboPartner.delete_organization("org-uuid")

TurboDocxSdk::TurboPartner.update_organization_entitlements("org-uuid",
  features: { maxUsers: 100, hasTDAI: true }
)
```

### Organization users, API keys

```ruby
TurboDocxSdk::TurboPartner.list_organization_users("org-uuid")
TurboDocxSdk::TurboPartner.add_user_to_organization("org-uuid", email: "user@example.com", role: "contributor")
TurboDocxSdk::TurboPartner.update_organization_user_role("org-uuid", "user-uuid", role: "admin")
TurboDocxSdk::TurboPartner.remove_user_from_organization("org-uuid", "user-uuid")
TurboDocxSdk::TurboPartner.resend_organization_invitation_to_user("org-uuid", "user-uuid")

# API key value is returned ONLY on creation — store it immediately
key = TurboDocxSdk::TurboPartner.create_organization_api_key("org-uuid", name: "Production Key", role: "admin")
puts key["data"]["key"]  # capture now; never shown again
TurboDocxSdk::TurboPartner.list_organization_api_keys("org-uuid")
TurboDocxSdk::TurboPartner.update_organization_api_key("org-uuid", "key-uuid", name: "Renamed")
TurboDocxSdk::TurboPartner.revoke_organization_api_key("org-uuid", "key-uuid")
```

### Partner API keys and partner-portal users

```ruby
key = TurboDocxSdk::TurboPartner.create_partner_api_key(name: "CI/CD Key", scopes: ["org:create", "org:read"])
puts key["data"]["key"]  # store immediately
TurboDocxSdk::TurboPartner.list_partner_api_keys(limit: 10)
TurboDocxSdk::TurboPartner.update_partner_api_key("key-uuid", name: "Renamed")
TurboDocxSdk::TurboPartner.revoke_partner_api_key("key-uuid")

TurboDocxSdk::TurboPartner.add_user_to_partner_portal(
  email: "ops@company.com", role: "member",
  permissions: { canManageOrgs: true, canViewAuditLogs: true }
)
TurboDocxSdk::TurboPartner.list_partner_portal_users(search: "ops")
TurboDocxSdk::TurboPartner.update_partner_user_permissions("user-uuid", permissions: { canManageOrgs: false })
TurboDocxSdk::TurboPartner.remove_user_from_partner_portal("user-uuid")
TurboDocxSdk::TurboPartner.resend_partner_portal_invitation_to_user("user-uuid")
```

### Audit logs

```ruby
logs = TurboDocxSdk::TurboPartner.get_partner_audit_logs(
  action: "org.created", startDate: "2026-01-01", endDate: "2026-12-31", limit: 100
)
logs["data"]["results"].each { |e| puts "#{e['action']} - #{e['createdOn']}" }
```

Available partner-key scopes cover `org:*`, `entitlements:update`, `org-users:*`, `partner-users:*`, `org-apikeys:*`, `partner-apikeys:*`, and `audit:read` (see `TurboDocxSdk::PartnerScope`).

---

## TurboWebhooks

TurboWebhooks manages a single per-org **signature webhook** (fixed name `signature`) subscribed to events such as `signature.document.completed` and `signature.document.voided`. It is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

### TurboWebhooks.configure

```ruby
TurboDocxSdk::TurboWebhooks.configure(
  api_key: ENV["TURBODOCX_API_KEY"],  # admin TDX- key
  org_id:  ENV["TURBODOCX_ORG_ID"]
)
```

No `sender_email` — webhooks don't send email. The routes require the **organization administrator** role; a non-admin key raises `TurboDocxSdk::AuthorizationError` (403).

### create_webhook

```ruby
created = TurboDocxSdk::TurboWebhooks.create_webhook(
  urls:   ["https://your-server.example.com/webhooks/turbodocx"],  # HTTPS only
  events: ["signature.document.completed", "signature.document.voided"]
)
puts created["secret"]  # shown ONCE — store it server-side immediately
```

Raises `TurboDocxSdk::ValidationError` if the signature webhook already exists (update or delete it first) or for non-HTTPS URLs.

### get_webhook / update_webhook / delete_webhook

```ruby
webhook = TurboDocxSdk::TurboWebhooks.get_webhook
# webhook["deliveryStats"], webhook["availableEvents"]

TurboDocxSdk::TurboWebhooks.update_webhook(is_active: false)
TurboDocxSdk::TurboWebhooks.update_webhook(
  urls:   ["https://new-endpoint.example.com/webhooks/turbodocx"],
  events: ["signature.document.completed"]
)
TurboDocxSdk::TurboWebhooks.delete_webhook  # soft-delete + delivery history wiped
```

All `update_webhook` keyword args are optional — pass only what you want to change.

### test_webhook / notify_webhook

```ruby
tested = TurboDocxSdk::TurboWebhooks.test_webhook(
  event_type: "signature.document.completed",
  payload:    { "documentId" => "doc-xyz", "status" => "completed" }
)
puts tested["summary"]  # { "total" => ..., "successful" => ..., "failed" => ... }
```

`notify_webhook(event_type:, payload:)` routes through the same handler; prefer `test_webhook` in new code.

### regenerate_webhook_secret

```ruby
rotated = TurboDocxSdk::TurboWebhooks.regenerate_webhook_secret
puts rotated["secret"]  # new secret; old signatures fail immediately after rotation
```

### list_webhook_deliveries / replay_webhook_delivery / get_webhook_stats

```ruby
deliveries = TurboDocxSdk::TurboWebhooks.list_webhook_deliveries(limit: 10, offset: 0, is_delivered: false, http_status: 500)
replayed   = TurboDocxSdk::TurboWebhooks.replay_webhook_delivery(deliveries["results"][0]["id"])

stats = TurboDocxSdk::TurboWebhooks.get_webhook_stats(days: 30)
puts stats["summary"]["successRate"]
puts stats["eventBreakdown"]
```

### Verifying inbound webhook signatures

Webhook deliveries are signed with HMAC-SHA256 over `"#{timestamp}.#{raw_body}"`. Verify the `X-TurboDocx-Signature` header with the free module function `TurboDocxSdk.verify_webhook_signature` **before** trusting the payload. Read the **raw body bytes** — a parse-then-reserialize breaks the HMAC.

```ruby
# In a Rack / Rails webhook receiver:
raw_body  = request.body.read
signature = request.get_header("HTTP_X_TURBODOCX_SIGNATURE") || ""
timestamp = request.get_header("HTTP_X_TURBODOCX_TIMESTAMP") || ""
secret    = ENV["TURBODOCX_WEBHOOK_SECRET"]  # the secret saved from create_webhook

unless TurboDocxSdk.verify_webhook_signature(
  payload:          raw_body,
  signature_header: signature,
  timestamp_header: timestamp,
  secret:           secret
)
  return [401, {}, ["invalid signature"]]
end

event = JSON.parse(raw_body)
# process event["eventType"], event["data"], ...
[200, {}, ["ok"]]
```

The helper enforces a 300-second timestamp tolerance by default (`tolerance_seconds: 0` disables it — not recommended) and uses constant-time comparison. It is a **free module function** — `TurboDocxSdk.verify_webhook_signature`, not a method on `TurboWebhooks` — with no API key dependency.

### TurboWebhooks error handling

```ruby
begin
  TurboDocxSdk::TurboWebhooks.create_webhook(urls: urls, events: events)
rescue TurboDocxSdk::ValidationError    # 400 — already exists, non-HTTPS URL, or empty events
rescue TurboDocxSdk::AuthorizationError # 403 — TDX- key lacks administrator role
rescue TurboDocxSdk::AuthenticationError # 401 — bad / revoked API key
rescue TurboDocxSdk::NotFoundError      # 404 — webhook does not exist
rescue TurboDocxSdk::RateLimitError     # 429 — back off and retry
rescue TurboDocxSdk::TurboDocxError => e # any other typed SDK error
  warn "Error #{e.status_code}: #{e.message}"
end
```

---

## TurboQuote

Sales quoting (CPQ): build a product catalog, assemble quotes with line items and bundles, apply price books, and send quotes. Full CRUD for quotes, products, bundles, price books, companies, contacts, templates, and types — 68 operations.

### TurboQuote.configure

```ruby
TurboDocxSdk::TurboQuote.configure(
  api_key: ENV["TURBODOCX_API_KEY"],  # REQUIRED (or access_token:)
  org_id:  ENV["TURBODOCX_ORG_ID"]    # REQUIRED — backend 401s without it
)
```

No `sender_email` — TurboQuote never sends signature emails.

### create_quote

```ruby
quote = TurboDocxSdk::TurboQuote.create_quote(
  "name"       => "Professional Services Q3 2026",
  "companyId"  => "company-uuid",
  "contactId"  => "contact-uuid",
  "currency"   => TurboDocxSdk::Currency::USD,
  "validUntil" => "2026-09-30"
)
puts quote["id"]
puts quote["quoteNumber"]  # e.g. "Q-0042"
puts quote["status"]       # "draft"
```

Numeric fields (`subtotal`, `grandTotal`, `taxRate`, …) come back as Ruby numbers — the response normalizer coerces the backend's decimal strings automatically.

### add_line_items

```ruby
# Single hash is auto-wrapped into an array
items = TurboDocxSdk::TurboQuote.add_line_items(quote["id"],
  "productId"        => "product-uuid",
  "productName"      => "Consulting Service",
  "unitPrice"        => 500,
  "billingFrequency" => TurboDocxSdk::BillingFrequency::MONTHLY,
  "quantity"         => 3,
  "discountType"     => TurboDocxSdk::DiscountType::PERCENT,
  "discountPercent"  => 10
)
puts items[0]["id"]

# Multiple items — custom (no-product) items need "productId" => nil explicitly
TurboDocxSdk::TurboQuote.add_line_items(quote["id"], [
  { "productId" => nil, "productName" => "Setup Fee", "unitPrice" => 1500, "billingFrequency" => "one-time", "quantity" => 1 },
  { "productId" => nil, "productName" => "License",   "unitPrice" => 200,  "billingFrequency" => "monthly",  "quantity" => 10 }
])
```

### add_bundle_line_items

```ruby
TurboDocxSdk::TurboQuote.add_bundle_line_items(quote["id"],
  "bundleId"   => "bundle-uuid",
  "bundleName" => "Starter Bundle",
  "quantity"   => 2
)
```

### send_quote

```ruby
sent = TurboDocxSdk::TurboQuote.send_quote(quote["id"])
puts sent["message"]         # "Quote sent successfully"
puts sent["quote"]["status"] # "sent"
```

### download_quote_pdf

```ruby
pdf_bytes = TurboDocxSdk::TurboQuote.download_quote_pdf(quote["id"])
File.binwrite("quote.pdf", pdf_bytes)
```

### Catalog management (products, bundles, price books)

```ruby
# A category (type) is required before creating products
category = TurboDocxSdk::TurboQuote.create_type(
  "name"         => "SaaS",
  "categoryType" => TurboDocxSdk::CategoryType::PRODUCT_CATEGORY
)

product = TurboDocxSdk::TurboQuote.create_product(
  "name"             => "Enterprise Seat",
  "categoryId"       => category["id"],
  "listPrice"        => 150.00,
  "billingFrequency" => TurboDocxSdk::BillingFrequency::MONTHLY,
  "showInCatalog"    => true
)

bundle = TurboDocxSdk::TurboQuote.create_bundle(
  "name"       => "Starter Pack",
  "categoryId" => category["id"],
  "items"      => [
    { "productId" => product["id"], "unitPrice" => 150.00, "quantity" => 1, "billingFrequency" => "monthly" }
  ]
)

# Price book: name + priceBookTypeId + validFrom + discountPercent are all required
pb_type = TurboDocxSdk::TurboQuote.create_type(
  "name" => "Partner Pricing", "categoryType" => TurboDocxSdk::CategoryType::PRICEBOOK_TYPE
)
price_book = TurboDocxSdk::TurboQuote.create_price_book(
  "name"            => "Partner Tier A",
  "priceBookTypeId" => pb_type["id"],
  "validFrom"       => "2026-01-01",
  "discountPercent" => 15
)
applied = TurboDocxSdk::TurboQuote.apply_price_book(quote["id"], price_book["id"])
puts applied["updatedCount"], applied["skippedCount"]
```

### Convenience: create_and_send

```ruby
result = TurboDocxSdk::TurboQuote.create_and_send(
  "name"      => "Enterprise License",
  "companyId" => "company-uuid",
  "contactId" => "contact-uuid",
  "items"     => [
    { "productId" => nil, "productName" => "Support Plan", "unitPrice" => 800, "billingFrequency" => "annual", "quantity" => 1 }
  ]
  # "bundleItems" => [...],  # optional
  # "send"        => {...}   # optional send options
)
puts result["quote"]["status"]  # "sent"
```

### get_quote_number_config

Admin-only. Read the org's quote-number config — the format driving how new quote numbers are generated.

```ruby
config = TurboDocxSdk::TurboQuote.get_quote_number_config
puts config["format"]["prefix"]  # e.g. "Q"
puts config["currentFloor"]      # lowest start number issuable this period
```

**Response:** `{ "format" => {...}, "currentFloor" => Integer }`. `format` carries `prefix`, `yearToken` (`"none" | "two" | "four"`), `monthToken` (`"off" | "two"`), `separator`, `padWidth` (int 0–12), `suffix`, `startNumber` (int >= 0), and `resetCadence` (`"never" | "yearly" | "monthly"`). `currentFloor` is the per-period issued floor — `startNumber` can't be set below it.

### update_quote_number_config

Admin-only. Pass the **full** format hash (all eight keys). Request-body keys stay **camelCase verbatim**; `padWidth` and `startNumber` are integers.

```ruby
updated = TurboDocxSdk::TurboQuote.update_quote_number_config(
  "prefix"       => "INV",
  "yearToken"    => TurboDocxSdk::QuoteNumberYearToken::NONE,      # "none" | "two" | "four"
  "monthToken"   => TurboDocxSdk::QuoteNumberMonthToken::OFF,      # "off" | "two"
  "separator"    => "-",
  "padWidth"     => 4,                                             # int 0-12
  "suffix"       => "",
  "startNumber"  => 1000,                                          # int >= 0 (can't be below currentFloor)
  "resetCadence" => TurboDocxSdk::QuoteNumberResetCadence::NEVER   # "never" | "yearly" | "monthly"
)
puts updated["format"]["prefix"]  # "INV"
puts updated["currentFloor"]
```

**Response:** same `{ "format" => {...}, "currentFloor" => Integer }` shape as `get_quote_number_config`. Non-admin callers receive `TurboDocxSdk::AuthorizationError`. The token/cadence constants (`TurboDocxSdk::QuoteNumberYearToken`, `QuoteNumberMonthToken`, `QuoteNumberResetCadence`) let you avoid hard-coding the string literals.

### Bulk create (CSV-style imports)

Six catalog resources support bulk creation from an array of row hashes (e.g. a parsed CSV): `bulk_create_products`, `bulk_create_price_books`, `bulk_create_bundles`, `bulk_create_companies`, `bulk_create_contacts`, and `bulk_create_types`. Each takes an **array of row hashes** (same field shapes as the corresponding single `create_*` method, with camelCase keys); the SDK wraps them in the `{ "rows" => [...] }` envelope the `POST {resource}/bulk` endpoint expects.

```ruby
report = TurboDocxSdk::TurboQuote.bulk_create_products([
  { "name" => "Basic Plan",   "listPrice" => 10,  "billingFrequency" => "monthly", "categoryId" => "category-uuid" },
  { "name" => "Premium Plan", "listPrice" => 100, "billingFrequency" => "monthly", "categoryId" => "category-uuid" }
])

puts "Imported: #{report['imported']}"

# Partial success: inspect failed rows instead of assuming all-or-nothing
report["failed"].each do |f|
  warn "Row #{f['row']} failed: #{f['reason']}"      # "row" is 1-indexed
end
report["adjusted"].each do |a|
  puts "Row #{a['row']} adjusted: #{a['reason']}"     # imported with a server-side tweak
end
```

**Response:** a `BulkImportResult` hash — `{ "imported" => Integer, "failed" => [...], "adjusted" => [...] }`, where each entry in `failed`/`adjusted` is `{ "row" => Integer, "reason" => String }` (`row` is 1-indexed into the rows you sent).

Bulk-create semantics:

- **Partial success** — a failed row does **not** raise and does **not** roll back the rows before it. It is reported in `report["failed"]` with a 1-indexed `"row"` and a `"reason"`. Rows the server tweaked (e.g. an unknown bundle item dropped) appear in `report["adjusted"]`. Always read `report["failed"]` rather than assuming every row imported.
- **500-row cap per request** — more than 500 rows raises `TurboDocxSdk::ValidationError` (400). The SDK does not validate the rows or the cap client-side.
- **Roles** — available to administrator and contributor API keys.

### TurboQuote error handling

```ruby
begin
  TurboDocxSdk::TurboQuote.send_quote(quote_id)
rescue TurboDocxSdk::ValidationError     # 400 — bad field value or missing required field
rescue TurboDocxSdk::AuthenticationError # 401 — bad / missing API key or org_id
rescue TurboDocxSdk::AuthorizationError  # 403 — key lacks the required role (e.g. admin-only config)
rescue TurboDocxSdk::NotFoundError       # 404 — quote or resource not found
rescue TurboDocxSdk::RateLimitError      # 429 — back off and retry
rescue TurboDocxSdk::TurboDocxError => e # any other typed SDK error
  warn "Error #{e.status_code}: #{e.message}"
end
```

---

## Rails Integration Example

```ruby
# config/initializers/turbodocx.rb
require "turbodocx_sdk"

TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],
  org_id:       ENV["TURBODOCX_ORG_ID"],
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"]
)
```

```ruby
# app/controllers/contracts_controller.rb
class ContractsController < ApplicationController
  def create
    result = TurboDocxSdk::TurboSign.send_signature(
      fileLink:   params[:pdf_url],       # camelCase request keys
      recipients: params[:recipients],
      fields:     params[:fields]
    )
    render json: { success: true, document_id: result["documentId"] }
  rescue TurboDocxSdk::TurboDocxError => e
    render json: { error: e.message }, status: e.status_code || 500
  end
end
```

## Sinatra Integration Example

```ruby
require "sinatra"
require "json"
require "turbodocx_sdk"

TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],
  org_id:       ENV["TURBODOCX_ORG_ID"],
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"]
)

post "/api/send-contract" do
  body = JSON.parse(request.body.read)
  result = TurboDocxSdk::TurboSign.send_signature(
    fileLink:   body["pdf_url"],
    recipients: body["recipients"],
    fields:     body["fields"]
  )
  content_type :json
  { success: true, document_id: result["documentId"] }.to_json
end
```

---

## Error Handling

```ruby
require "turbodocx_sdk"

begin
  TurboDocxSdk::TurboSign.send_signature(...)
rescue TurboDocxSdk::AuthenticationError => e  # 401 — invalid/missing API key
  warn e.message
rescue TurboDocxSdk::ValidationError => e      # 400 — bad request (e.g. missing sender_email)
  warn e.message
rescue TurboDocxSdk::NotFoundError             # 404 — document/org not found
rescue TurboDocxSdk::RateLimitError            # 429 — too many requests
rescue TurboDocxSdk::NetworkError              # connection failure (no status)
rescue TurboDocxSdk::TurboDocxError => e       # catch-all typed SDK error
  warn "Error #{e.status_code}: #{e.message}"
end
```

All errors extend `TurboDocxSdk::TurboDocxError` and carry a `status_code` (and `message`). The subtypes map to HTTP status codes:

| Class | HTTP Status |
|:------|:------------|
| `TurboDocxSdk::AuthenticationError` | 401 |
| `TurboDocxSdk::AuthorizationError` | 403 |
| `TurboDocxSdk::ValidationError` | 400 |
| `TurboDocxSdk::NotFoundError` | 404 |
| `TurboDocxSdk::ConflictError` | 409 |
| `TurboDocxSdk::RateLimitError` | 429 |
| `TurboDocxSdk::NetworkError` | (no status) |
| `TurboDocxSdk::TurboDocxError` | base class |

The error classes are **not** namespaced under a module — reference them directly as `TurboDocxSdk::ValidationError`, etc.

---

## Method Reference

### TurboSign

| Method | Description |
|--------|-------------|
| `TurboDocxSdk::TurboSign.configure(api_key:, org_id:, sender_email:, sender_name:)` | Set credentials (sender_email required) |
| `TurboDocxSdk::TurboSign.create_signature_review_link(request)` | Prepare a document and get a preview URL (no emails sent) |
| `TurboDocxSdk::TurboSign.send_signature(request)` | Prepare a document and immediately email recipients |
| `TurboDocxSdk::TurboSign.get_status(document_id)` | Get current document + recipient status |
| `TurboDocxSdk::TurboSign.download(document_id)` | Download signed PDF as raw bytes |
| `TurboDocxSdk::TurboSign.void_document(document_id, reason)` | Cancel a signature request (reason required) |
| `TurboDocxSdk::TurboSign.resend_email(document_id, recipient_ids)` | Resend signature email to recipient UUIDs |
| `TurboDocxSdk::TurboSign.get_audit_trail(document_id)` | Get tamper-evident audit log |

### Deliverable

| Method | Description |
|--------|-------------|
| `TurboDocxSdk::Deliverable.configure(api_key:, org_id:)` | Set credentials |
| `TurboDocxSdk::Deliverable.generate_deliverable(request)` | Render a template with variables into a new deliverable |
| `TurboDocxSdk::Deliverable.list_deliverables(options)` | Paginated list with search/tag filters (`offset`, not `page`) |
| `TurboDocxSdk::Deliverable.get_deliverable_details(id, options)` | Get full record including variables and tags |
| `TurboDocxSdk::Deliverable.update_deliverable_info(id, request)` | Update name/description/tags (tags replace) |
| `TurboDocxSdk::Deliverable.delete_deliverable(id)` | Soft-delete |
| `TurboDocxSdk::Deliverable.download_source_file(id)` | Download original DOCX/PPTX as raw bytes |
| `TurboDocxSdk::Deliverable.download_pdf(id)` | Download rendered PDF as raw bytes |

### TurboPartner

| Method | Description |
|--------|-------------|
| `TurboDocxSdk::TurboPartner.configure(partner_api_key:, partner_id:)` | Set partner credentials |
| `create_organization`, `list_organizations`, `get_organization_details`, `update_organization_info`, `delete_organization`, `update_organization_entitlements` | Organization CRUD + entitlements |
| `add_user_to_organization`, `list_organization_users`, `update_organization_user_role`, `remove_user_from_organization`, `resend_organization_invitation_to_user` | Org user management |
| `create_organization_api_key`, `list_organization_api_keys`, `update_organization_api_key`, `revoke_organization_api_key` | Org API keys (key returned only on creation) |
| `create_partner_api_key`, `list_partner_api_keys`, `update_partner_api_key`, `revoke_partner_api_key` | Partner API keys (key returned only on creation) |
| `add_user_to_partner_portal`, `list_partner_portal_users`, `update_partner_user_permissions`, `remove_user_from_partner_portal`, `resend_partner_portal_invitation_to_user` | Partner-portal users |
| `get_partner_audit_logs` | Filter audit logs by action/resource/date/success |

### TurboWebhooks

| Method | Description |
|--------|-------------|
| `TurboDocxSdk::TurboWebhooks.configure(api_key:, org_id:)` | Set credentials (no sender_email; admin key required) |
| `TurboDocxSdk::TurboWebhooks.create_webhook(urls:, events:)` | Subscribe the org to events (HTTPS URLs only) |
| `TurboDocxSdk::TurboWebhooks.get_webhook` | Get the org's signature webhook + delivery stats |
| `TurboDocxSdk::TurboWebhooks.update_webhook(urls:, events:, is_active:)` | Patch any subset of fields |
| `TurboDocxSdk::TurboWebhooks.delete_webhook` | Soft-delete the webhook |
| `TurboDocxSdk::TurboWebhooks.test_webhook(event_type:, payload:)` | Fire a test delivery; surfaces per-URL errors |
| `TurboDocxSdk::TurboWebhooks.notify_webhook(event_type:, payload:)` | Manual notify; same handler as test_webhook |
| `TurboDocxSdk::TurboWebhooks.regenerate_webhook_secret` | Rotate the HMAC secret (shown ONCE) |
| `TurboDocxSdk::TurboWebhooks.list_webhook_deliveries(options)` | Paginated delivery history with filters |
| `TurboDocxSdk::TurboWebhooks.replay_webhook_delivery(delivery_id)` | Retry a past delivery; returns the new delivery row |
| `TurboDocxSdk::TurboWebhooks.get_webhook_stats(days:)` | Aggregate stats over a sliding window |
| `TurboDocxSdk.verify_webhook_signature(payload:, signature_header:, timestamp_header:, secret:)` | Free module function; verifies inbound deliveries |

### TurboQuote — Quotes

| Method | Description |
|--------|-------------|
| `TurboDocxSdk::TurboQuote.configure(api_key:, org_id:)` | Set credentials (no sender_email) |
| `list_quotes(options)` | Paginated list with filters/stats |
| `create_quote(request)` | Create a new draft quote |
| `get_quote(id)` | Get quote details (statusInfo merged in) |
| `update_quote(id, request)` | PATCH quote fields; explicit `nil` clears nullable fields |
| `delete_quote(id)` / `duplicate_quote(id)` | Delete / clone a quote |
| `send_quote(id, request)` | Email quote; returns `{ "quote", "message" }` |
| `send_quote_with_deliverable(id, request)` | Send with attached deliverable; returns `{ quote, message, documentId }` |
| `decline_quote(id, request)` / `void_quote(id, request)` | Decline / void a quote |
| `handle_expired_quote(id, request)` | Extend, re-send, or void an expired sent quote |
| `apply_price_book(quote_id, price_book_id)` / `remove_price_book(quote_id)` | Attach/detach a price book |
| `download_quote_pdf(id)` | Download rendered quote PDF as raw bytes |
| `get_quote_number_config` | Admin: read `{ format, currentFloor }` |
| `update_quote_number_config(format)` | Admin: update the quote-number format; returns `{ format, currentFloor }` |
| `create_and_send(request)` | Convenience: create + add items + send in one call |

### TurboQuote — Line Items

| Method | Description |
|--------|-------------|
| `list_line_items(quote_id, options)` | List line items |
| `add_line_items(quote_id, items)` | Add product line item(s); single hash auto-wrapped to array |
| `add_bundle_line_items(quote_id, items)` | Add bundle line item(s) |
| `update_line_item(quote_id, item_id, request)` | Update a line item |
| `remove_line_item(quote_id, item_id)` | Remove a line item |

### TurboQuote — Products

| Method | Description |
|--------|-------------|
| `list_products(options)` | Paginated product catalog |
| `create_product(request)` | Create a product |
| `bulk_create_products(rows)` | Bulk-import products; returns a partial-success `BulkImportResult` hash |
| `get_product(id)` / `update_product(id, request)` / `delete_product(id)` / `duplicate_product(id)` | Product CRUD |
| `get_product_primary_images(product_ids)` | Batch-fetch primary images |

### TurboQuote — Bundles

| Method | Description |
|--------|-------------|
| `list_bundles(options)` | Paginated bundle catalog |
| `create_bundle(request)` | Create a bundle |
| `bulk_create_bundles(rows)` | Bulk-import bundles; returns a partial-success `BulkImportResult` hash |
| `get_bundle(id)` / `update_bundle(id, request)` / `delete_bundle(id)` / `duplicate_bundle(id)` | Bundle CRUD |

### TurboQuote — Price Books

| Method | Description |
|--------|-------------|
| `list_price_books(options)` | Paginated price-book list |
| `create_price_book(request)` | Create a price book |
| `bulk_create_price_books(rows)` | Bulk-import price books; returns a partial-success `BulkImportResult` hash |
| `get_price_book(id)` / `update_price_book(id, request)` / `delete_price_book(id)` / `duplicate_price_book(id)` | Price-book CRUD |
| `list_price_book_products(id, options)` | List products attached to a price book |

### TurboQuote — Companies and Contacts

| Method | Description |
|--------|-------------|
| `list_companies(options)` | Paginated company list |
| `create_company(request)` | Create a company (`contacts` array with ≥ 1 entry required) |
| `bulk_create_companies(rows)` | Bulk-import companies; returns a partial-success `BulkImportResult` hash |
| `get_company(id)` / `update_company(id, request)` / `delete_company(id)` | Company CRUD |
| `list_company_contacts(company_id, options)` | List a company's contacts |
| `list_contacts(options)` | Paginated contact list |
| `create_contact(request)` | Create a standalone contact |
| `bulk_create_contacts(rows)` | Bulk-import contacts; returns a partial-success `BulkImportResult` hash |
| `update_contact(id, request)` / `delete_contact(id)` | Contact update/delete |

### TurboQuote — Templates and Types

| Method | Description |
|--------|-------------|
| `list_templates(options)` | List quote templates |
| `get_template` | Get the org's singleton default template |
| `get_template_by_id(id)` | Get a specific template by ID |
| `create_template(request)` / `update_template(id, request)` / `delete_template(id)` | Template CRUD |
| `list_types(options)` | List quote types/categories |
| `create_type(request)` | Create a quote type |
| `bulk_create_types(rows)` | Bulk-import types/categories; returns a partial-success `BulkImportResult` hash |
| `update_type(id, request)` / `delete_type(id)` | Type update/delete |

---

## Gotchas

- **Method args are snake_case; request-hash keys stay camelCase.** `send_signature`, `create_quote`, `api_key:`, `sender_email:` are snake_case. But keys **inside** a request hash (`documentName`, `signingOrder`, `recipientEmail`, `companyId`, `billingFrequency`, `productId`, …) are forwarded to the API verbatim and must stay camelCase. Writing `document_name:` in a payload hash silently drops the value.
- **`sender_email` is required** for `TurboSign.configure` — omitting it raises `TurboDocxSdk::ValidationError`. `Deliverable`, `TurboWebhooks`, and `TurboQuote` do **not** need it.
- **Static class pattern** — `configure` once per module, then call class methods (`TurboDocxSdk::TurboSign.send_signature(...)`). No instantiation.
- **Responses are plain hashes with string keys** — access fields with `result["documentId"]`, not symbol keys or method calls.
- **Downloads return raw bytes** — `download`, `download_pdf`, `download_source_file`, and `download_quote_pdf` return the file bytes directly; persist with `File.binwrite`.
- **`void_document` requires a `reason`** (second positional arg). **`resend_email` takes recipient UUIDs**, not email addresses — fetch them from the send/review response or `get_audit_trail`.
- **Pagination uses `offset:`, not `page:`** across `list_*` methods.
- **API key values are returned only on creation** for `create_organization_api_key` and `create_partner_api_key` — capture `result["data"]["key"]` immediately.
- **TurboWebhooks requires an admin TDX- key.** A non-admin key raises `TurboDocxSdk::AuthorizationError` (403). One webhook per org, fixed name `signature` — there is no `list_webhooks` by design; use the REST API for multi-webhook setups.
- **Webhook secrets are shown ONCE** — capture `created["secret"]` from `create_webhook` and `rotated["secret"]` from `regenerate_webhook_secret` immediately.
- **Read the RAW request body in your webhook receiver** (`request.body.read`) before verifying — never parse-then-reserialize the JSON. `TurboDocxSdk.verify_webhook_signature` is a **free module function**, not a method on `TurboWebhooks`, and has no API key dependency.
- **TurboQuote decimal fields come back as Ruby numbers**, not strings — the response normalizer coerces `listPrice`, `unitPrice`, `discountPercent`, `subtotal`, `grandTotal`, `taxRate`, etc. Do not parse them yourself.
- **PATCH with explicit `nil` clears nullable fields.** For `update_quote`, `update_line_item`, `update_product`, etc., passing `"priceBookId" => nil` sends `null` and clears the field; omitting the key leaves it unchanged.
- **Custom (no-product) line items need `"productId" => nil` explicitly.** `add_line_items` auto-wraps a single hash into an array; the return is always an array.
- **`get_quote_number_config` / `update_quote_number_config` are admin-only** — non-admin callers get `TurboDocxSdk::AuthorizationError`. `update_quote_number_config` requires the full 8-field format hash with camelCase keys; `padWidth`/`startNumber` are integers.
- **Bulk creates are partial-success, not transactional.** `bulk_create_products`/`bulk_create_price_books`/`bulk_create_bundles`/`bulk_create_companies`/`bulk_create_contacts`/`bulk_create_types` never raise on a bad row — read `report["failed"]` (`[{ "row", "reason" }]`, `row` 1-indexed) and `report["adjusted"]`; earlier rows are not rolled back. Cap is 500 rows/request (over → `ValidationError` 400). Admin + contributor keys only. Row-hash keys stay camelCase.
- **Use the SDK constants** (`TurboDocxSdk::BillingFrequency::MONTHLY`, `DiscountType::PERCENT`, `Currency::USD`, `CategoryType::PRODUCT_CATEGORY`, `QuoteNumberResetCadence::NEVER`, …) instead of hard-coding string literals. Each constants module also exposes an `ALL` array of valid values.
- **Ruby 2.7+ and zero runtime dependencies** — the gem uses only `net/http`, `json`, and `openssl` from the standard library.

**Full API reference:** https://docs.turbodocx.com/docs
