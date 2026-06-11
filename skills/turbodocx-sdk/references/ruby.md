# Ruby SDK Reference

## Install

Add to your `Gemfile`:

```ruby
gem "turbodocx-sdk"
```

Then run:

```bash
bundle install
```

Or install directly:

```bash
gem install turbodocx-sdk
```

For `.env` loading, add the `dotenv` gem:

```ruby
gem "dotenv"
```

Load it in your entry point / bootstrap (Rails loads it automatically with `dotenv-rails`):

```ruby
require "dotenv/load"
```

Requires **Ruby 2.7+**.

## Require

```ruby
require "turbodocx_sdk"
```

Everything lives under the `TurboDocxSdk::` namespace:

```ruby
TurboDocxSdk::TurboSign
TurboDocxSdk::Deliverable
TurboDocxSdk::TurboPartner
TurboDocxSdk::TurboWebhooks
TurboDocxSdk::TurboQuote
```

Each module is a **class with class-level (static) methods** — call `.configure(...)` once, then call methods directly on the class. No instantiation.

> **Calling conventions — read this first.**
> - `configure`, all `TurboWebhooks` methods, and `verify_webhook_signature` use real Ruby **keyword arguments** (`urls:`, `events:`, `is_active:`, `payload:`, …).
> - Everything else takes **positional id argument(s) plus a single request `Hash`**. The hash is passed straight to the backend, so **its keys must be camelCase** (`documentName`, `companyId`, `recipientEmail`) — the SDK does **not** convert snake_case to camelCase. You can still write the clean trailing-keyword style (`document_name: ...`) only where the method signature actually declares keywords; for request hashes use camelCase string or symbol keys.
> - Responses are Ruby **Hashes with the API's original (camelCase) string keys**: `result["documentId"]`, `webhook["isActive"]`, `page["totalRecords"]`.

## TurboSign Configuration

```ruby
require "turbodocx_sdk"

TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],      # REQUIRED (or access_token:)
  org_id:       ENV["TURBODOCX_ORG_ID"],       # REQUIRED
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"], # REQUIRED — reply-to for signature emails
  sender_name:  ENV["TURBODOCX_SENDER_NAME"]   # OPTIONAL but recommended
)
```

`sender_email` is **required** for TurboSign. It is the reply-to address on signature request emails.

## TurboSign Usage

All TurboSign send methods take a single request `Hash`. Document input is one of `:file` (raw bytes / IO), `:fileLink` (URL), `:deliverableId`, or `:templateId`. **The hash keys are camelCase** (`documentName`, `fileLink`, …); `recipients`/`fields` inner objects use the API's camelCase JSON keys (`signingOrder`, `recipientEmail`).

### send_signature

```ruby
pdf_bytes = File.binread("contract.pdf")

result = TurboDocxSdk::TurboSign.send_signature(
  file:         pdf_bytes,
  documentName: "Partnership Agreement",
  recipients: [
    { "name" => "John Doe", "email" => "john@example.com", "signingOrder" => 1 }
  ],
  fields: [
    {
      "type"           => "signature",
      "recipientEmail" => "john@example.com",
      "template"       => {
        "anchor"    => "{signature1}",
        "placement" => "replace",
        "size"      => { "width" => 100, "height" => 30 }
      }
    }
  ]
)

puts "Document ID: #{result['documentId']}"
result["recipients"].each do |r|
  puts "  #{r['name']}: #{r['signUrl']}"   # personal signing link per recipient
end
```

### get_status

```ruby
status = TurboDocxSdk::TurboSign.get_status(document_id)
puts "Status: #{status['status']}"   # "pending" | "completed" | "voided"

status["recipients"].each do |r|
  puts "  #{r['email']}: #{r['status']}"
end
```

### download

```ruby
pdf_bytes = TurboDocxSdk::TurboSign.download(document_id)
File.binwrite("signed.pdf", pdf_bytes)
```

Returns raw bytes (a `String`) — write them with `File.binwrite`.

### create_signature_review_link

Prepares the document with recipients and fields but **does not send signature emails** — use it to preview field placement before sending.

```ruby
result = TurboDocxSdk::TurboSign.create_signature_review_link(
  file:         pdf_bytes,
  documentName: "NDA - Acme",
  recipients: [
    { "name" => "John Doe", "email" => "john@example.com", "signingOrder" => 1 }
  ],
  fields: [
    {
      "type"           => "signature",
      "page"           => 1,
      "x"              => 100,
      "y"              => 500,
      "width"          => 200,
      "height"         => 50,
      "recipientEmail" => "john@example.com"
    }
  ]
)

puts "Document ID: #{result['documentId']}"
puts "Preview URL: #{result['previewUrl']}"   # open to review field placement
result.fetch("recipients", []).each do |r|
  puts "  #{r['name']}: #{r['signUrl']}"
end
```

### void_document

```ruby
voided = TurboDocxSdk::TurboSign.void_document(document_id, "Counterparty requested changes")
puts "Status: #{voided['status']}"     # "voided"
```

The `reason` (second positional arg) is **required**.

### resend_email

```ruby
# recipient_ids are UUIDs — fetch from the send/review response recipients or from get_audit_trail
result = TurboDocxSdk::TurboSign.resend_email(document_id, ["recipient-uuid-1", "recipient-uuid-2"])
puts "Resent to #{result['recipientCount']} recipients"
```

### get_audit_trail

```ruby
audit = TurboDocxSdk::TurboSign.get_audit_trail(document_id)
puts "Document: #{audit['document']['name']}"

audit["auditTrail"].each do |entry|
  email = entry.dig("user", "email") || ""
  puts "#{entry['timestamp']}  #{entry['actionType']}  #{email}"
end
```

## Deliverable Configuration

Deliverable generates documents from TurboDocx templates with variable substitution, and manages/downloads the resulting files. It does **not** send signature emails, so `sender_email` is **not** required — `skip_sender_validation: true` is hardcoded inside `configure`.

```ruby
require "turbodocx_sdk"

TurboDocxSdk::Deliverable.configure(
  api_key: ENV["TURBODOCX_API_KEY"],   # REQUIRED (or access_token:)
  org_id:  ENV["TURBODOCX_ORG_ID"]     # REQUIRED
  # base_url: "https://api.turbodocx.com"  # optional
)
```

## Deliverable Usage

### generate_deliverable

Generate a document from a template, substituting variables. Takes a single request `Hash` with camelCase keys.

```ruby
result = TurboDocxSdk::Deliverable.generate_deliverable(
  "templateId"  => "template-uuid",
  "name"        => "Acme MSA 2026",
  "variables"   => [
    { "name" => "ClientName", "value" => "Acme Corporation" },
    { "name" => "EffectiveDate", "value" => "2026-07-01" }
  ],
  "description" => "Master Services Agreement",
  "tags"        => ["msa", "acme"]
)

deliverable = result["results"]["deliverable"]
puts "Deliverable ID: #{deliverable['id']}"
```

`templateId`, `name`, and `variables` are required.

### list_deliverables

```ruby
page = TurboDocxSdk::Deliverable.list_deliverables(
  limit:    20,
  offset:   0,
  query:    "acme",
  show_tags: true
)

puts "Total: #{page['totalRecords']}"
page["results"].each { |d| puts "  #{d['name']} (#{d['id']})" }
```

`list_deliverables` accepts an options `Hash` (snake_case `:limit`, `:offset`, `:query`, `:show_tags` are all recognized).

### get_deliverable_details

```ruby
deliverable = TurboDocxSdk::Deliverable.get_deliverable_details("deliverable-uuid", show_tags: true)
puts deliverable["name"]
# returns the unwrapped deliverable record (variables, fonts, template info)
```

### update_deliverable_info

```ruby
res = TurboDocxSdk::Deliverable.update_deliverable_info("deliverable-uuid",
  "name"        => "Acme MSA (final)",
  "description" => "Signed copy",
  "tags"        => ["msa", "final"]   # replaces ALL existing tags
)
puts res["message"]
```

All three fields (`name`, `description`, `tags`) are optional. Providing `tags` **replaces** the existing tags.

### delete_deliverable

```ruby
res = TurboDocxSdk::Deliverable.delete_deliverable("deliverable-uuid")  # soft delete
puts res["deliverableId"]
```

### download_source_file

```ruby
bytes = TurboDocxSdk::Deliverable.download_source_file("deliverable-uuid")  # DOCX/PPTX bytes
File.binwrite("deliverable.docx", bytes)
```

### download_pdf

```ruby
pdf_bytes = TurboDocxSdk::Deliverable.download_pdf("deliverable-uuid")
File.binwrite("deliverable.pdf", pdf_bytes)
```

## TurboPartner Configuration

TurboPartner uses a separate partner API key (`TDXP-` prefix) and a partner UUID. It does not send signature emails, so no `sender_email` is needed.

```ruby
require "turbodocx_sdk"

TurboDocxSdk::TurboPartner.configure(
  partner_api_key: ENV["TURBODOCX_PARTNER_API_KEY"],  # must start with TDXP-
  partner_id:      ENV["TURBODOCX_PARTNER_ID"]        # partner UUID
)
```

## TurboPartner Usage

All TurboPartner methods take positional id arg(s) plus a request `Hash` with camelCase keys.

### create_organization

```ruby
org = TurboDocxSdk::TurboPartner.create_organization(
  "name"     => "Acme Corporation",
  "features" => { "maxUsers" => 50, "hasTDAI" => true }
)

puts "Organization ID: #{org['data']['id']}"
```

### list_organizations

```ruby
orgs = TurboDocxSdk::TurboPartner.list_organizations("limit" => 20, "offset" => 0, "search" => "acme")

orgs["data"].each { |o| puts "  #{o['name']} (#{o['id']})" }
```

### get_organization_details

```ruby
details = TurboDocxSdk::TurboPartner.get_organization_details("org-uuid")
```

### update_organization_entitlements

```ruby
TurboDocxSdk::TurboPartner.update_organization_entitlements("org-uuid",
  "features" => { "maxUsers" => 100, "hasTDAI" => true }
)
```

Other organization methods: `update_organization_info(org_id, request)`, `delete_organization(org_id)`. User management: `list_organization_users`, `add_user_to_organization`, `update_organization_user_role`, `remove_user_from_organization`, `resend_organization_invitation_to_user`. API keys: `list_organization_api_keys`, `create_organization_api_key`, `update_organization_api_key`, `revoke_organization_api_key`. Partner-level: `list_partner_api_keys`, `create_partner_api_key`, `update_partner_api_key`, `revoke_partner_api_key`, `list_partner_portal_users`, `add_user_to_partner_portal`, `update_partner_user_permissions`, `remove_user_from_partner_portal`, `resend_partner_portal_invitation_to_user`, and `get_partner_audit_logs`.

## TurboWebhooks Configuration

TurboWebhooks subscribes a single per-org HTTPS endpoint (locked to the fixed name `signature`) to TurboDocx events such as `signature.document.completed` and `signature.document.voided`. The SDK is intentionally one-webhook-per-org to mirror the dashboard's Signature Webhooks page.

```ruby
require "turbodocx_sdk"

TurboDocxSdk::TurboWebhooks.configure(
  api_key: ENV["TURBODOCX_API_KEY"],   # admin TDX- key
  org_id:  ENV["TURBODOCX_ORG_ID"]
)
```

`skip_sender_validation: true` is hardcoded inside `configure` — webhooks don't send email. The webhook routes require the organization administrator role; a non-admin TDX- key raises `AuthorizationError` (HTTP 403).

## TurboWebhooks Usage

Unlike the other modules, **every TurboWebhooks method uses Ruby keyword arguments.**

### create_webhook

```ruby
created = TurboDocxSdk::TurboWebhooks.create_webhook(
  urls:   ["https://your-server.example.com/webhooks/turbodocx"],  # must be HTTPS
  events: ["signature.document.completed", "signature.document.voided"]
)

# `secret` is shown ONCE — store it server-side immediately.
webhook_id = created["id"]
secret     = created["secret"]
```

Raises `ConflictError` (409) if the signature webhook already exists for the org. Raises `ValidationError` (400) for non-HTTPS URLs.

### get_webhook

```ruby
webhook = TurboDocxSdk::TurboWebhooks.get_webhook
# webhook["urls"], webhook["events"], webhook["isActive"]
# webhook["deliveryStats"], webhook["availableEvents"]
```

### update_webhook

```ruby
TurboDocxSdk::TurboWebhooks.update_webhook(
  urls:      ["https://your-server.example.com/webhooks/turbodocx"],
  events:    ["signature.document.completed"],
  is_active: true
)
```

All three keyword args are optional — pass only what you want to change. Untouched fields are omitted from the PATCH.

### delete_webhook

```ruby
TurboDocxSdk::TurboWebhooks.delete_webhook   # soft-delete + delivery history wiped
```

### test_webhook

```ruby
result = TurboDocxSdk::TurboWebhooks.test_webhook(
  event_type: "signature.document.completed",
  payload:    { "documentId" => "...", "documentName" => "..." }
)
# result["summary"]: { "total", "successful", "failed", "errors" => [...] }
# result["deliveries"]: array of WebhookDelivery records
```

Per-URL failure messages live in `result["summary"]["errors"]`. Use this from a CI smoke test before flipping a new receiver into production.

### notify_webhook

```ruby
TurboDocxSdk::TurboWebhooks.notify_webhook(
  event_type: "signature.document.completed",
  payload:    { "documentId" => "..." }
)
```

Routes through the same backend handler as `test_webhook` and returns the same shape — prefer `test_webhook` in new code.

### regenerate_webhook_secret

```ruby
rotated = TurboDocxSdk::TurboWebhooks.regenerate_webhook_secret
# rotated["secret"] — shown ONCE; old signatures fail immediately after rotation
```

### list_webhook_deliveries

```ruby
page = TurboDocxSdk::TurboWebhooks.list_webhook_deliveries(
  limit:        20,
  offset:       0,
  event_type:   "signature.document.completed",
  is_delivered: false,
  http_status:  500
)
# page["results"]: array of WebhookDelivery; page["totalRecords"]
```

### replay_webhook_delivery

```ruby
new_delivery = TurboDocxSdk::TurboWebhooks.replay_webhook_delivery(delivery_id)
# Full WebhookDelivery row returned — id, httpStatus, attemptCount, etc.
```

### get_webhook_stats

```ruby
stats = TurboDocxSdk::TurboWebhooks.get_webhook_stats(days: 30)
# stats["summary"]["successRate"], stats["summary"]["avgResponseTime"], ...
# stats["eventBreakdown"]: per-event totals
```

### Verifying inbound webhook signatures

When TurboDocx POSTs to your receiver, verify the `X-TurboDocx-Signature` header before trusting the payload. The helper enforces a 5-minute timestamp tolerance (`tolerance_seconds:`, default 300) and uses a constant-time comparison. It is a **free module function** (`TurboDocxSdk.verify_webhook_signature`), not a method on `TurboWebhooks`, and takes keyword arguments. It never raises on bad input — it returns a `Boolean`.

```ruby
# In your Rack / Rails webhook handler:
raw_body  = request.body.read   # raw bytes — do NOT JSON.parse then re-encode first
signature = request.get_header("HTTP_X_TURBODOCX_SIGNATURE") || ""
timestamp = request.get_header("HTTP_X_TURBODOCX_TIMESTAMP") || ""
secret    = ENV["TURBODOCX_WEBHOOK_SECRET"]   # the secret you saved from create_webhook

valid = TurboDocxSdk.verify_webhook_signature(
  payload:          raw_body,
  signature_header: signature,
  timestamp_header: timestamp,
  secret:           secret
  # tolerance_seconds: 300,  # optional; 0 disables the replay-window check
)
return [401, {}, ["invalid signature"]] unless valid

event = JSON.parse(raw_body)
# process event["eventType"], event["data"], ...
[200, {}, ["ok"]]
```

### TurboWebhooks error handling

```ruby
begin
  TurboDocxSdk::TurboWebhooks.create_webhook(urls: urls, events: events)
rescue TurboDocxSdk::ConflictError
  # 409 — signature webhook already exists for this org. Update or delete it.
rescue TurboDocxSdk::ValidationError
  # 400 — typically a non-HTTPS URL or empty events array.
rescue TurboDocxSdk::AuthorizationError
  # 403 — TDX- key lacks the administrator role.
rescue TurboDocxSdk::AuthenticationError
  # 401 — bad / revoked API key.
rescue TurboDocxSdk::NotFoundError
  # 404 — read/update/delete against a webhook that does not exist.
rescue TurboDocxSdk::RateLimitError
  # 429 — back off and retry.
rescue TurboDocxSdk::NetworkError
  # No status — the request never reached the server.
rescue TurboDocxSdk::TurboDocxError
  # Any other typed SDK error (e.g. raw 5xx).
end
```

## TurboQuote Configuration

TurboQuote manages the full quoting lifecycle: companies, contacts, products, bundles, price books, and quotes — all the way through sending to a customer and downloading the PDF.

```ruby
require "turbodocx_sdk"

TurboDocxSdk::TurboQuote.configure(
  api_key: ENV["TURBODOCX_API_KEY"],   # REQUIRED (or access_token:)
  org_id:  ENV["TURBODOCX_ORG_ID"]     # REQUIRED in practice
  # base_url: "https://api.turbodocx.com"  # optional
)
```

Unlike `TurboSign`, `TurboQuote` does **not** require `sender_email` (`skip_sender_validation: true` is hardcoded). `org_id` is technically optional in the SDK (it lazily reads env vars on first use), but the backend returns `401` without it, so treat it as required.

## TurboQuote Usage

All TurboQuote methods take positional id arg(s) plus a request/options `Hash` with **camelCase keys** (`companyId`, `validUntil`, `unitPrice`, …). Single-quote string literals can be replaced by the SDK constants below.

### create_quote

```ruby
quote = TurboDocxSdk::TurboQuote.create_quote(
  "name"      => "Enterprise License Q3",
  "companyId" => "company-uuid",
  "contactId" => "contact-uuid",
  "currency"  => TurboDocxSdk::Currency::USD,
  "termDays"  => 30
)

puts "Quote ID: #{quote['id']}"        # result is already unwrapped
puts "Status: #{quote['status']}"
```

### add_line_items

```ruby
# A single item Hash is auto-wrapped into an array.
# For an ad-hoc (non-catalog) line item, set "productId" => nil explicitly.
items = TurboDocxSdk::TurboQuote.add_line_items(quote["id"], [
  {
    "productId"        => nil,
    "productName"      => "Platform Subscription",
    "unitPrice"        => 499.00,
    "billingFrequency" => TurboDocxSdk::BillingFrequency::MONTHLY,
    "quantity"         => 1
  },
  {
    "productId"        => nil,
    "productName"      => "Professional Services",
    "unitPrice"        => 2500.00,
    "billingFrequency" => "one-time",
    "quantity"         => 5,
    "discountType"     => TurboDocxSdk::DiscountType::PERCENT,
    "discountPercent"  => 10
  }
])
puts "First line item ID: #{items[0]['id']}"   # returns the created LineItem array
```

To add a bundle (a pre-grouped set of products) use `add_bundle_line_items(quote_id, items)`.

### send_quote

```ruby
result = TurboDocxSdk::TurboQuote.send_quote(quote["id"], { "validUntil" => "2026-09-30" })
puts "Status: #{result['quote']['status']}"   # "sent"
puts "Message: #{result['message']}"
```

The request `Hash` (`:ccEmails`, `:validUntil`) is optional — `send_quote(quote["id"])` works too.

### download_quote_pdf

```ruby
pdf_bytes = TurboDocxSdk::TurboQuote.download_quote_pdf(quote["id"])
File.binwrite("quote.pdf", pdf_bytes)
```

Returns raw bytes — write them directly with `File.binwrite` or stream them as a response.

### Products and bundles (catalog)

```ruby
# Create a catalog product
product = TurboDocxSdk::TurboQuote.create_product(
  "name"             => "Annual SaaS License",
  "listPrice"        => 999.00,
  "billingFrequency" => TurboDocxSdk::BillingFrequency::ANNUAL,
  "categoryId"       => "category-uuid",
  "showInCatalog"    => true
)

# Create a bundle (categoryId is required)
bundle = TurboDocxSdk::TurboQuote.create_bundle(
  "name"       => "Starter Pack",
  "categoryId" => "category-uuid",
  "items"      => [{ "productId" => product["id"], "quantity" => 1 }]
)

# Create a price book and apply it to a quote.
# name, priceBookTypeId, validFrom, and discountPercent are required;
# priceBookTypeId comes from a create_type with categoryType "pricebook_type".
price_book = TurboDocxSdk::TurboQuote.create_price_book(
  "name"            => "Partner Tier A",
  "priceBookTypeId" => "pricebook-type-uuid",
  "validFrom"       => "2026-01-01",
  "discountPercent" => 15.0
)

result = TurboDocxSdk::TurboQuote.apply_price_book(quote["id"], price_book["id"])
# result => { "quote" => {...}, "message" => "...", "updatedCount" => N, "skippedCount" => N }
```

### create_and_send convenience method

```ruby
result = TurboDocxSdk::TurboQuote.create_and_send(
  "name"      => "Quick Deal",
  "companyId" => "company-uuid",
  "contactId" => "contact-uuid",
  "currency"  => "USD",
  "items"     => [
    { "productId" => nil, "productName" => "Starter Plan", "unitPrice" => 99.00,
      "billingFrequency" => "monthly", "quantity" => 1 }
  ]
)
puts result["quote"]["status"]   # "sent"
```

### Constants

The SDK exposes constants to avoid hard-coding string literals:

```ruby
TurboDocxSdk::QuoteStatus::DRAFT             # "draft"
TurboDocxSdk::QuoteStatus::SENT              # "sent"
TurboDocxSdk::BillingFrequency::MONTHLY      # "monthly"
TurboDocxSdk::BillingFrequency::ANNUAL       # "annual"
TurboDocxSdk::DiscountType::PERCENT          # "percent"
TurboDocxSdk::DiscountType::AMOUNT           # "amount"
TurboDocxSdk::Currency::USD                  # "USD"
TurboDocxSdk::LineItemType::PRODUCT          # "product"
TurboDocxSdk::CategoryType::PRODUCT_CATEGORY # "product_category"
```

### TurboQuote error handling

```ruby
begin
  TurboDocxSdk::TurboQuote.send_quote(quote_id)
rescue TurboDocxSdk::ValidationError
  # 400 — missing required field or invalid value (e.g., unknown currency)
rescue TurboDocxSdk::AuthenticationError
  # 401 — bad/missing API key, or missing org_id
rescue TurboDocxSdk::NotFoundError
  # 404 — quote, product, or price book not found
rescue TurboDocxSdk::RateLimitError
  # 429 — back off and retry
rescue TurboDocxSdk::NetworkError
  # No status — request never reached the server
rescue TurboDocxSdk::TurboDocxError
  # Any other typed SDK error
end
```

## Rails Integration Example

Configure each module once in an initializer.

```ruby
# config/initializers/turbodocx.rb
require "turbodocx_sdk"

TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],
  org_id:       ENV["TURBODOCX_ORG_ID"],
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"],
  sender_name:  ENV["TURBODOCX_SENDER_NAME"]
)

TurboDocxSdk::TurboWebhooks.configure(
  api_key: ENV["TURBODOCX_API_KEY"],
  org_id:  ENV["TURBODOCX_ORG_ID"]
)
```

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Flat paths that map to the top-level SignaturesController below.
  # (Don't wrap these in `namespace :signatures` — that resolves to
  # Signatures::SignaturesController and raises "uninitialized constant".)
  post "signatures/send",       to: "signatures#create"
  get  "signatures/:id/status", to: "signatures#status"
  post "webhooks/turbodocx",    to: "webhooks#turbodocx"
end
```

```ruby
# app/controllers/signatures_controller.rb
class SignaturesController < ApplicationController
  # TurboSign send flow
  def create
    uploaded = params.require(:file)
    result = TurboDocxSdk::TurboSign.send_signature(
      file:         uploaded.read,
      documentName: params.require(:document_name),
      recipients:   JSON.parse(params.require(:recipients)),  # camelCase JSON: name, email, signingOrder
      fields:       JSON.parse(params.require(:fields))        # camelCase JSON: type, recipientEmail, ...
    )
    render json: result
  rescue TurboDocxSdk::TurboDocxError => e
    render json: { error: e.message }, status: (e.status_code || 500)
  end

  def status
    render json: TurboDocxSdk::TurboSign.get_status(params[:id])
  rescue TurboDocxSdk::TurboDocxError => e
    render json: { error: e.message }, status: (e.status_code || 500)
  end
end
```

```ruby
# app/controllers/webhooks_controller.rb
class WebhooksController < ApplicationController
  # Server-to-server POSTs carry no CSRF token. `raise: false` keeps this safe
  # in API-only apps (ActionController::API) where the callback isn't installed
  # and a bare skip_before_action would raise ArgumentError at load.
  skip_before_action :verify_authenticity_token, only: :turbodocx, raise: false

  def turbodocx
    # Use request.raw_post, NOT request.body.read: once Rails parses params on a
    # JSON request the rack input is drained and body.read returns "", so the
    # HMAC would never match. raw_post returns the cached signed bytes.
    raw_body  = request.raw_post
    signature = request.headers["X-TurboDocx-Signature"] || ""
    timestamp = request.headers["X-TurboDocx-Timestamp"] || ""

    unless TurboDocxSdk.verify_webhook_signature(
      payload:          raw_body,
      signature_header: signature,
      timestamp_header: timestamp,
      secret:           ENV["TURBODOCX_WEBHOOK_SECRET"]
    )
      return head :unauthorized
    end

    event = JSON.parse(raw_body)
    # handle event["eventType"], event["data"], ...
    head :ok
  end
end
```

## Sinatra / Rack Integration Example

```ruby
require "sinatra"
require "json"
require "turbodocx_sdk"

TurboDocxSdk::TurboSign.configure(
  api_key:      ENV["TURBODOCX_API_KEY"],
  org_id:       ENV["TURBODOCX_ORG_ID"],
  sender_email: ENV["TURBODOCX_SENDER_EMAIL"]
)

# TurboSign send flow
post "/signatures/send" do
  content_type :json
  begin
    file = params[:file][:tempfile].read
    result = TurboDocxSdk::TurboSign.send_signature(
      file:         file,
      documentName: params[:document_name],
      recipients:   JSON.parse(params[:recipients]),
      fields:       JSON.parse(params[:fields])
    )
    result.to_json
  rescue TurboDocxSdk::TurboDocxError => e
    status(e.status_code || 500)
    { error: e.message }.to_json
  end
end

# Webhook receiver — verify before trusting the payload
post "/webhooks/turbodocx" do
  raw_body  = request.body.read
  signature = request.env["HTTP_X_TURBODOCX_SIGNATURE"] || ""
  timestamp = request.env["HTTP_X_TURBODOCX_TIMESTAMP"] || ""

  unless TurboDocxSdk.verify_webhook_signature(
    payload:          raw_body,
    signature_header: signature,
    timestamp_header: timestamp,
    secret:           ENV["TURBODOCX_WEBHOOK_SECRET"]
  )
    halt 401, "invalid signature"
  end

  event = JSON.parse(raw_body)
  # process event["eventType"], event["data"], ...
  status 200
  "ok"
end
```

## Error Handling

All errors inherit from `TurboDocxSdk::TurboDocxError` and carry `#status_code` and `#code` readers.

```ruby
require "turbodocx_sdk"

begin
  TurboDocxSdk::TurboSign.send_signature(request)
rescue TurboDocxSdk::AuthenticationError => e
  # 401 — invalid/missing API key
rescue TurboDocxSdk::AuthorizationError => e
  # 403 — authenticated but lacks the required role
rescue TurboDocxSdk::ValidationError => e
  # 400 — bad request (e.g., missing sender_email)
rescue TurboDocxSdk::NotFoundError => e
  # 404 — document/org not found
rescue TurboDocxSdk::ConflictError => e
  # 409 — conflicts with current resource state
rescue TurboDocxSdk::RateLimitError => e
  # 429 — too many requests
rescue TurboDocxSdk::NetworkError => e
  # connection failure (no HTTP status)
rescue TurboDocxSdk::TurboDocxError => e
  # catch-all for any SDK error
  warn "Error #{e.status_code} (#{e.code}): #{e.message}"
end
```

### Error Hierarchy

| Class | HTTP Status | `#code` |
|:------|:------------|:--------|
| `TurboDocxSdk::AuthenticationError` | 401 | `AUTHENTICATION_ERROR` |
| `TurboDocxSdk::AuthorizationError` | 403 | `AUTHORIZATION_ERROR` |
| `TurboDocxSdk::ValidationError` | 400 | `VALIDATION_ERROR` |
| `TurboDocxSdk::NotFoundError` | 404 | `NOT_FOUND` |
| `TurboDocxSdk::ConflictError` | 409 | `CONFLICT` |
| `TurboDocxSdk::RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` |
| `TurboDocxSdk::NetworkError` | (no status) | `NETWORK_ERROR` |
| `TurboDocxSdk::TurboDocxError` | base class | — |

## Method Reference

| Method | Description |
|--------|-------------|
| `TurboSign.configure(api_key:, org_id:, sender_email:, sender_name: nil, base_url: nil)` | Configure TurboSign (sender_email required) |
| `TurboSign.send_signature(request)` | Send document for e-signature |
| `TurboSign.create_signature_review_link(request)` | Prepare without sending emails |
| `TurboSign.get_status(document_id)` | Get document + recipient status |
| `TurboSign.download(document_id)` | Download signed PDF as raw bytes |
| `TurboSign.void_document(document_id, reason)` | Cancel a signature request (reason required) |
| `TurboSign.resend_email(document_id, recipient_ids)` | Resend signature email to recipient UUIDs |
| `TurboSign.get_audit_trail(document_id)` | Get complete audit trail |
| `Deliverable.configure(api_key:, org_id:, base_url: nil)` | Configure Deliverable (no sender_email) |
| `Deliverable.generate_deliverable(request)` | Generate a document from a template |
| `Deliverable.list_deliverables(options = nil)` | List deliverables with pagination/search |
| `Deliverable.get_deliverable_details(id, options = nil)` | Get one deliverable (unwrapped) |
| `Deliverable.update_deliverable_info(id, request)` | Update name/description/tags |
| `Deliverable.delete_deliverable(id)` | Soft-delete a deliverable |
| `Deliverable.download_source_file(deliverable_id)` | Download source DOCX/PPTX bytes |
| `Deliverable.download_pdf(deliverable_id)` | Download PDF bytes |
| `TurboPartner.configure(partner_api_key:, partner_id:, base_url: nil)` | Configure with TDXP- key + partner UUID |
| `TurboPartner.create_organization(request)` | Provision a new customer org |
| `TurboPartner.list_organizations(request = nil)` | List managed organizations |
| `TurboPartner.get_organization_details(org_id)` | Get org details |
| `TurboPartner.update_organization_info(org_id, request)` | Update org info |
| `TurboPartner.delete_organization(org_id)` | Delete an org |
| `TurboPartner.update_organization_entitlements(org_id, request)` | Update org features/tracking |
| `TurboPartner.list_organization_users(org_id, request = nil)` | List org users |
| `TurboPartner.add_user_to_organization(org_id, request)` | Add a user to an org |
| `TurboPartner.update_organization_user_role(org_id, user_id, request)` | Update a user's role |
| `TurboPartner.remove_user_from_organization(org_id, user_id)` | Remove a user from an org |
| `TurboPartner.resend_organization_invitation_to_user(org_id, user_id)` | Resend an org invite |
| `TurboPartner.list_organization_api_keys(org_id, request = nil)` | List org API keys |
| `TurboPartner.create_organization_api_key(org_id, request)` | Create an org API key (full value once) |
| `TurboPartner.update_organization_api_key(org_id, api_key_id, request)` | Update an org API key |
| `TurboPartner.revoke_organization_api_key(org_id, api_key_id)` | Revoke an org API key |
| `TurboPartner.list_partner_api_keys(request = nil)` | List partner API keys |
| `TurboPartner.create_partner_api_key(request)` | Create a partner API key |
| `TurboPartner.update_partner_api_key(key_id, request)` | Update a partner API key |
| `TurboPartner.revoke_partner_api_key(key_id)` | Revoke a partner API key |
| `TurboPartner.list_partner_portal_users(request = nil)` | List partner portal users |
| `TurboPartner.add_user_to_partner_portal(request)` | Add a partner portal user |
| `TurboPartner.update_partner_user_permissions(user_id, request)` | Update a partner user's permissions |
| `TurboPartner.remove_user_from_partner_portal(user_id)` | Remove a partner portal user |
| `TurboPartner.resend_partner_portal_invitation_to_user(user_id)` | Resend a partner portal invite |
| `TurboPartner.get_partner_audit_logs(request = nil)` | List partner audit logs with filters |
| `TurboWebhooks.configure(api_key:, org_id:, base_url: nil)` | Configure the webhook client (skip_sender_validation hardcoded) |
| `TurboWebhooks.create_webhook(urls:, events:)` | Subscribe the org to events (HTTPS URLs only) |
| `TurboWebhooks.get_webhook` | Get the org's signature webhook + delivery stats |
| `TurboWebhooks.update_webhook(urls:, events:, is_active:)` | Patch any subset of fields |
| `TurboWebhooks.delete_webhook` | Soft-delete the webhook |
| `TurboWebhooks.test_webhook(event_type:, payload:)` | Fire a test delivery; surfaces per-URL errors |
| `TurboWebhooks.notify_webhook(event_type:, payload:)` | Manual notify; same handler as test_webhook |
| `TurboWebhooks.regenerate_webhook_secret` | Rotate the HMAC secret (shown once) |
| `TurboWebhooks.list_webhook_deliveries(limit:, offset:, event_type:, is_delivered:, http_status:)` | Paginated delivery history with filters |
| `TurboWebhooks.replay_webhook_delivery(delivery_id)` | Retry a past delivery |
| `TurboWebhooks.get_webhook_stats(days:)` | Aggregate stats over a sliding window |
| `TurboDocxSdk.verify_webhook_signature(payload:, signature_header:, timestamp_header:, secret:, tolerance_seconds: 300, now: nil)` | Free function — verify inbound `X-TurboDocx-Signature` |
| `TurboQuote.configure(api_key:, org_id:, base_url: nil)` | Configure the quote client (no sender_email) |
| **TurboQuote — Quotes** | |
| `TurboQuote.create_quote(request)` | Create a new quote (result unwrapped) |
| `TurboQuote.list_quotes(options = nil)` | List quotes with pagination, filters, stats |
| `TurboQuote.get_quote(id)` | Get quote by ID (statusInfo merged in) |
| `TurboQuote.update_quote(id, request)` | PATCH quote fields (null-clears nullable fields) |
| `TurboQuote.delete_quote(id)` | Delete a quote |
| `TurboQuote.duplicate_quote(id)` | Duplicate a quote |
| `TurboQuote.download_quote_pdf(id)` | Download quote as raw PDF bytes |
| `TurboQuote.send_quote(id, request = nil)` | Send quote; returns `{quote, message}` |
| `TurboQuote.send_quote_with_deliverable(id, request)` | Send with attached deliverable; returns `{quote, message, documentId}` |
| `TurboQuote.decline_quote(id, request)` | Mark a quote as declined |
| `TurboQuote.void_quote(id, request)` | Void a quote |
| `TurboQuote.handle_expired_quote(id, request)` | Re-send or void an expired quote |
| `TurboQuote.apply_price_book(quote_id, price_book_id)` | Apply price book; returns `{quote, message, updatedCount, skippedCount}` |
| `TurboQuote.remove_price_book(quote_id)` | Remove the applied price book |
| `TurboQuote.create_and_send(request)` | Create quote + add items + send in one call |
| **TurboQuote — Line Items** | |
| `TurboQuote.list_line_items(quote_id, options = nil)` | List items on a quote |
| `TurboQuote.add_line_items(quote_id, items)` | Add product line item(s); single Hash auto-wrapped |
| `TurboQuote.add_bundle_line_items(quote_id, items)` | Add bundle line item(s) |
| `TurboQuote.update_line_item(quote_id, item_id, request)` | Update a line item |
| `TurboQuote.remove_line_item(quote_id, item_id)` | Remove a line item |
| **TurboQuote — Products** | |
| `TurboQuote.list_products(options = nil)` | List catalog products |
| `TurboQuote.create_product(request)` | Create a product (multipart when `images` provided) |
| `TurboQuote.get_product(id)` | Get product by ID |
| `TurboQuote.update_product(id, request)` | Update a product |
| `TurboQuote.delete_product(id)` | Delete a product |
| `TurboQuote.duplicate_product(id)` | Duplicate a product |
| `TurboQuote.get_product_primary_images(product_ids)` | Batch-fetch primary images for product IDs |
| **TurboQuote — Price Books** | |
| `TurboQuote.list_price_books(options = nil)` | List price books |
| `TurboQuote.create_price_book(request)` | Create a price book (discountPercent defaults to 0) |
| `TurboQuote.get_price_book(id)` | Get price book by ID |
| `TurboQuote.update_price_book(id, request)` | Update a price book |
| `TurboQuote.delete_price_book(id)` | Delete a price book |
| `TurboQuote.duplicate_price_book(id)` | Duplicate a price book |
| `TurboQuote.list_price_book_products(id, options = nil)` | List products with custom pricing in a price book |
| **TurboQuote — Bundles** | |
| `TurboQuote.list_bundles(options = nil)` | List catalog bundles |
| `TurboQuote.create_bundle(request)` | Create a bundle (categoryId required) |
| `TurboQuote.get_bundle(id)` | Get bundle by ID |
| `TurboQuote.update_bundle(id, request)` | Update a bundle |
| `TurboQuote.delete_bundle(id)` | Delete a bundle |
| `TurboQuote.duplicate_bundle(id)` | Duplicate a bundle |
| **TurboQuote — Companies** | |
| `TurboQuote.list_companies(options = nil)` | List companies |
| `TurboQuote.create_company(request)` | Create a company (requires `contacts`) |
| `TurboQuote.get_company(id)` | Get company by ID |
| `TurboQuote.update_company(id, request)` | Update a company |
| `TurboQuote.delete_company(id)` | Delete a company |
| `TurboQuote.list_company_contacts(company_id, options = nil)` | List contacts for a company |
| **TurboQuote — Contacts** | |
| `TurboQuote.list_contacts(options = nil)` | List contacts |
| `TurboQuote.create_contact(request)` | Create a contact |
| `TurboQuote.update_contact(id, request)` | Update a contact |
| `TurboQuote.delete_contact(id)` | Delete a contact |
| **TurboQuote — Templates** | |
| `TurboQuote.list_templates(options = nil)` | List quote templates |
| `TurboQuote.get_template` | Get the org's active quote template (singleton) |
| `TurboQuote.get_template_by_id(id)` | Get a template by ID |
| `TurboQuote.create_template(request)` | Create a quote template |
| `TurboQuote.update_template(id, request)` | Update a quote template |
| `TurboQuote.delete_template(id)` | Delete a quote template |
| **TurboQuote — Types** | |
| `TurboQuote.list_types(options = nil)` | List quote types/categories |
| `TurboQuote.create_type(request)` | Create a type/category |
| `TurboQuote.update_type(id, request)` | Update a type/category |
| `TurboQuote.delete_type(id)` | Delete a type/category |

## Gotchas

- **Ruby 2.7+ required.**
- **Two calling conventions.** `configure`, all `TurboWebhooks` methods, and `verify_webhook_signature` take keyword arguments. Everything else takes positional id arg(s) plus a single request `Hash`.
- **Request-hash keys are camelCase**, not snake_case. The SDK passes request hashes straight to the backend with no key transform, so `documentName`, `companyId`, `recipientEmail`, `validUntil`, `unitPrice`, etc. must be camelCase. Passing snake_case keys means the value is silently dropped (e.g. `file_link:` is ignored; the upload has no source and fails). Method-level keyword args (only on `configure` / `TurboWebhooks` / `verify_webhook_signature`) are the snake_case exception.
- **Response keys stay as the API returns them** — camelCase string keys: `result["documentId"]`, `webhook["isActive"]`, `page["totalRecords"]`, `quote["quoteNumber"]`.
- **`sender_email` is required for TurboSign only.** Deliverable, TurboPartner, TurboWebhooks, and TurboQuote all hardcode `skip_sender_validation: true`.
- **Static class pattern** — `configure` once, then call methods on the class. No `.new`.
- **Real Ruby method names differ from PHP/JS.** It's `void_document` (not `void`), `resend_email` (not `resend`), `get_organization_details` (not `getOrganization`), `update_organization_entitlements` (not `updateEntitlements`).
- **`signUrl`** — each recipient in the `send_signature` / `create_signature_review_link` response has a `signUrl` (personal signing link). `create_signature_review_link` also returns a top-level `previewUrl`.
- **`resend_email` takes recipient UUIDs**, not email addresses — fetch them from the send/review response recipients or from `get_audit_trail`.
- **TurboWebhooks is one-per-org**, fixed name `signature`. Creating it twice returns `ConflictError` (409). There is no `list_webhooks` by design — for multi-webhook management call the REST API directly.
- **TurboWebhooks requires an admin TDX- key** (backend gate `requireOrgRole(administrator)`). A non-admin key raises `AuthorizationError` (403).
- **`create_webhook` URLs must be HTTPS** — non-HTTPS receivers raise `ValidationError` (400). For local dev, expose your receiver via an HTTPS tunnel (ngrok, cloudflared).
- **Save the secret immediately** — `create_webhook` and `regenerate_webhook_secret` return the HMAC secret ONCE; there is no endpoint to retrieve it later.
- **Signature verification** — pass the **raw request body bytes** to `verify_webhook_signature`. Never `JSON.parse` then re-encode first; the HMAC is over the raw bytes and re-encoded JSON will not match. The helper returns a `Boolean` and never raises on bad input.
- **TurboQuote results are unwrapped** — `create_quote`, `get_quote`, `update_quote`, product/bundle/price-book/company/contact/template/type getters all return the entity directly (the `{ "result": ... }` envelope is stripped). List endpoints return `{ "results" => [...], "totalRecords" => N }`.
- **PATCH null-clears nullable fields** — `update_quote`, `update_line_item`, `update_product`, etc. include explicitly-set `nil` values in the body, which clears that field on the server. Omitted keys are left unchanged. Don't pass `nil` for a field you don't intend to clear.
- **`discountType` is `"percent"` or `"amount"`** — use the literals or `TurboDocxSdk::DiscountType::PERCENT` / `::AMOUNT`. `billingFrequency` values are `"monthly"`, `"quarterly"`, `"annual"`, `"one-time"` (hyphen, not underscore).
- **Methods never mutate your input hash** — `create_product`, `create_price_book`, and `create_and_send` `dup` the request before extracting keys, so your original hash is left intact.

**Full API reference:** https://docs.turbodocx.com/docs
```