# Sweet Disorder Operations Platform — Claude Code Build Brief

**Read this entire document before writing any code.** This is one system with four
connected front-ends sharing a single Postgres database and a single set of backend
services. Even though we will build/ship in stages, the data model and API contracts
must be designed for the whole system up front, because every surface reads and writes
the same order/inventory/employee-task records. Do not design any single app in
isolation.

---

## 0. How to use this brief

1. Read Sections 1–7 first (context, vision, architecture, data model, integrations,
   auth). These are shared foundations every app depends on.
2. Then read Sections 8–12, one per application/feature area.
3. Section 13 (order lifecycle) ties all four apps together — re-read it after you've
   read all four app specs, to sanity-check that your schema and API design actually
   supports the full loop.
4. Section 16 gives a recommended build order. Follow it even though the repo is built
   as one monorepo — building in the wrong order will force rework.
5. Where this brief says "ASSUMPTION," treat it as a best-guess default, implement it,
   but flag it clearly in your output/README so the business owner can correct it.
6. Where this brief says "CONFIRM WITH USER," stop and ask before building that piece —
   these are genuine ambiguities, not just missing polish.

---

## 1. Business context & vocabulary

- **The business is Sweet Disorder** (sweetdisorder.co.nz) — a Silverdale, NZ-based
  novelty gift and retro-lolly company. Products are jars/bottles/tins of retro candy
  branded with cheeky, gift-occasion-driven names (e.g. "You Rock," "Bear Hugs,"
  "Fart Suppressants," "Senior Moment Suppressants"). Retail sells online via Shopify
  and from a physical shop at 25 Hibiscus Coast Highway, Silverdale; the business also
  sells wholesale into retailers across NZ and Australia. A share of every order
  supports mental health causes in NZ — not a system requirement, just brand context.
- **Molly** is the founder/operator ("Chief Dream Officer" per the site) — the
  day-to-day operations manager. She is not a developer — she needs a dashboard that
  is deliberately *simplified*, not a raw admin panel. She owns sales pipeline, lead
  tracking, and the master overview.
- **Employees** are floor/production staff who label and pack physical product. They
  need an extremely simple, almost gamified checklist UI — tap a button, see the next
  task, mark it done. They should never be shown the whole order backlog or irrelevant
  history — just "what do I do next."
- **Wholesale customers** are B2B buyers (NZ and Australia) who order in bulk through a
  dedicated portal, separate from the public Shopify storefront.
- **Retail customers** buy through the existing **Shopify** store — this is not being
  rebuilt, it's a data source to integrate with via Shopify's Admin API / webhooks.
- **The product catalog is real and large (~100 SKUs)** — see Section 5.1, sourced
  directly from the business's own inventory spreadsheet. Do not invent placeholder
  products; seed data should reflect the actual ranges below.
- Order fulfillment stages, in order: **1. Labelling → 2. Packing → 3. Dispatch**
  ("filling" a jar/bottle with the loose lolly product is part of stage 1 alongside
  applying the printed label — they happen at the same station).

---

## 2. Vision (one paragraph)

A single source of truth ("prod-data") tracks inventory, orders (from both Shopify and
a new wholesale portal), label/packaging compliance, and employee labour/productivity.
A **Master Connect dashboard** unifies this with Xero (accounting/export), Klaviyo/Brevo
(email), and supplier/reorder data, so nothing lives in five different disconnected
tools. **Molly** gets a simplified overview dashboard on top of the same data, focused
on sales pipeline and day-to-day ops rather than raw system administration.
**Wholesale customers** get a magic-link, no-password portal to browse the real product
catalog, see order history, and place reorders with recommended economical quantities,
NZ/AU splitting, and custom pricing. **Employees** get a dead-simple task app that turns
each incoming order into a labelling → packing → dispatch checklist.

---

## 3. System map — four applications, one backend

```
                        ┌─────────────────────────────┐
                        │        Neon Postgres          │  <- single source of truth
                        │  (products, orders, inventory, │
                        │   label compliance, tasks,      │
                        │   labour, pipeline)              │
                        └──────────────┬────────────────┘
                                       │
        ┌─────────────┬───────────────┼───────────────┬──────────────┐
        │             │               │               │              │
   ┌─────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐  ┌────────┐
   │Wholesale │  │  Master     │  │  Molly's   │  │  Employee     │  │External│
   │ Portal   │  │  Connect    │  │  Ops       │  │  Floor App    │  │Systems │
   │(external │  │  Dashboard  │  │  Dashboard │  │  (mobile-     │  │Shopify │
   │customers)│  │  (owner/    │  │  (simpli-  │  │  first)       │  │Xero    │
   │          │  │   admin)    │  │  fied)     │  │               │  │Klaviyo │
   └─────────┘  └────────────┘  └───────────┘  └──────────────┘  │Brevo   │
                                                                    └────────┘
```

- **Wholesale Portal** — customer-facing, magic-link auth, order placement + history.
- **Master Connect Dashboard** — internal, full-power admin view of everything:
  inventory, suppliers, integrations, employee productivity, label/packaging
  compliance, order status across all channels. This is "Dashboard #1" in the original
  planning notes.
- **Molly's Ops Dashboard ("Prod Dash")** — a curated subset/view layer over the same
  data: sales pipeline, lead tracking, order overview — built for daily use without
  overwhelm. ASSUMPTION: this is a *mode/view* within the Master Connect app (a
  simplified nav + dashboard for Molly's role) rather than a fully separate deployed
  app — CONFIRM WITH USER whether Molly should get her own separate app/URL or a
  role-based view inside the Master Connect app. Default to: same Next.js app,
  role-gated views.
- **Employee Floor App** — internal, extremely minimal UI, task-list only, tap-to-
  complete, mobile/tablet-first (assume shop floor tablets).

All four are Next.js apps (see Section 4) deployed as either one monorepo with route
groups per role, or separate Vercel projects sharing the same database — **recommend
one monorepo, one Next.js app**, so auth, the design system, and API routes are
shared, with **subdomain-based routing** (Section 3.1) rather than path prefixes, so
each surface gets its own clean subdomain once DNS is pointed at it. Only split into
separate Vercel projects later if deploy/scale needs diverge.

### 3.1 Subdomains & DNS (build for this from day one)

The business wants each surface reachable on its own subdomain of its real domain
(e.g. `sweetdisorder.co.nz`) once DNS is pointed at the deployment — so the routing
layer needs to be subdomain-aware from the start rather than retrofitted later.

**Recommended subdomains:**

| Subdomain | Surface |
|---|---|
| `portal.sweetdisorder.co.nz` | Wholesale customer portal (Section 8) |
| `dashboard.sweetdisorder.co.nz` | Molly's Ops Dashboard (Section 10) |
| `admin.sweetdisorder.co.nz` | Master Connect Dashboard (Section 9) |
| `floor.sweetdisorder.co.nz` | Employee Floor App (Section 11) |

CONFIRM WITH USER the exact subdomain names — the above are sensible defaults, not
fixed requirements. Names are cheap to bikeshed but should be picked once and used
consistently in code, emails, and QR codes/bookmarks staff create for the floor app.

**How this works technically (one Next.js app, still one deployment):**
- Keep the route-group structure from Section 17 (`/(wholesale)`, `/(admin)`, `/(ops)`,
  `/(floor)`) — subdomains and route groups are not in conflict, they're two layers.
- Add a `middleware.ts` that reads the incoming request's `host` header, matches it
  against the four subdomains above, and **rewrites** (not redirects) the request to
  the matching route group. A visitor to `portal.sweetdisorder.co.nz/orders` is
  internally served by `/(wholesale)/orders` with no visible path change.
- In Vercel: add all four subdomains as custom domains on the **same** Vercel project
  (Project Settings → Domains). Vercel issues certificates for each automatically.
- In the domain's DNS provider (wherever `sweetdisorder.co.nz`'s DNS is managed): add
  one `CNAME` record per subdomain pointing to `cname.vercel-dns.com` (Vercel will show
  the exact target value per domain once it's added in the dashboard — use that value,
  as it can vary). This is the step the business owner does themselves once the
  Vercel project exists — Claude Code doesn't need DNS access to build the app, only
  to build it so it's ready for this step.
- Local development: since subdomains don't resolve on `localhost`, support a
  `?surface=wholesale|admin|ops|floor` query override or a mapped-hosts-file approach
  in development so each route group is still reachable pre-DNS.
- Each surface's absolute URLs (magic-link login emails, dispatch notification links,
  "view your order" links) must point at **that surface's own subdomain**, not a
  single shared `APP_BASE_URL` — see Section 18's revised env var list. Getting this
  wrong is the most common subdomain bug: a wholesale customer's magic-link email
  linking to `admin.sweetdisorder.co.nz` instead of `portal.sweetdisorder.co.nz`.
- Retail Shopify traffic is unaffected — Shopify keeps whatever domain/subdomain it
  already uses; this platform only owns the four subdomains above.

---

## 4. Tech stack

- **Framework:** Next.js (App Router), TypeScript throughout.
- **Hosting/deploy:** Vercel.
- **Database:** Neon (serverless Postgres). Use **Prisma** with the Neon driver adapter
  for schema management/migrations — this project has enough entities that raw SQL
  migrations will slow the build down.
- **File storage:** Vercel Blob — for product images, packing-slip PDFs, exported
  Xero-format spreadsheets, printed-label artwork/proofs, any uploaded supplier
  documents.
- **Transactional email:** Brevo (magic-link emails, order confirmations, dispatch
  notifications, low-stock alerts, label-compliance urgency alerts to Molly).
- **Marketing email:** Klaviyo is referenced in the original planning notes as one of
  the systems the Master Connect dashboard links out to (for customer marketing flows).
  It is **not** the transactional sender — Brevo is. ASSUMPTION: Klaviyo integration is
  a "view/sync" link (customer signed up for marketing flows, tags synced) rather than
  something this build sends transactional mail through. CONFIRM WITH USER if Klaviyo
  needs a two-way sync (e.g., pushing wholesale customer emails/tags into Klaviyo
  lists) or is just a dashboard shortcut link for now.
- **Version control:** GitHub. Use conventional commits and feature branches per app
  area (see Section 17).
- **Auth:** Magic-link (passwordless) for wholesale customers; magic-link or
  email+password for internal staff — see Section 7.
- **Payments (Phase 2 only):** Not built in Phase 1. Phase 1 = pay via invoice
  (manual/Xero-driven). Phase 2 = in-portal payment (Stripe is the obvious default —
  CONFIRM WITH USER which processor before building Phase 2).

---

## 5. Shared data model (Neon Postgres via Prisma)

Design the schema so every app reads/writes the same tables. Sketch below — Claude
Code should turn this into a full Prisma schema with proper enums, indexes, and
foreign keys, and may add supporting tables (audit logs, sessions, webhooks_log, etc.)
as needed.

### 5.1 The real product catalog (from the business's own inventory spreadsheet)

This resolves what would otherwise be a guess. Sweet Disorder's catalog is organized
into **ranges**, each with its own SKU prefix:

| Range | SKU prefix | Approx. SKU count | Notes |
|---|---|---|---|
| Sweet Disorder Core Range | `SDP` | ~67 | The novelty-named jars/bottles (You Rock, Bear Hugs, Fart Suppressants, etc.) |
| Kiwi Range | `SDK` | ~9 | NZ-themed novelty names (Aroha, Bogan Blockers, Kia Kaha) |
| Old Classics Range | `CL` | ~10 | Plain retro lollies with no novelty name — the product name *is* the lolly (Acid Drops, Humbugs, Barley Sugar) |
| Treatmints | `SDT` | ~8 | Tins, sold with a companion 36-unit counter display stand, min order qty 4 per tin SKU |
| Christmas (seasonal) | none yet | ~4 currently | Seasonal jars; item codes get assigned when a seasonal line formally launches — **the schema must allow a product to exist without a finalized `sku` yet** |

Each product row in the source data carries:
- **Item code** (SKU, e.g. `SDP49`) — nullable for not-yet-coded seasonal items.
- **Barcode** (EAN/UPC) — nullable for the same reason.
- **Product description** (the marketing name, e.g. "Bear Hugs").
- **Packaging type**: `Bottle` | `Jar` | `Tin` | `Stand` — this is what an employee
  physically picks up and fills/labels, independent of the novelty name.
- **Lolly/filling type**: the actual candy inside (e.g. "Gummy bears", "Fizzies",
  "Wine Gums") — a separate attribute from the product name. Several different novelty
  products share the same filling (e.g. multiple SKUs use "Wine Gums" or "Black Balls"),
  so this is a many-products-to-one-filling relationship, not 1:1.
- **Minimum order quantity** per SKU (mostly 1, but 4 for Treatmints, and some seasonal
  rows currently blank).
- **Range** (see table above).

Prisma model:

**ProductRange**
- id, name (`Sweet Disorder Core Range` | `Kiwi Range` | `Old Classics Range` |
  `Treatmints` | `Christmas` | future seasonal ranges), sku_prefix.

**Filling** (the lolly/candy type — a shared lookup, not duplicated per product)
- id, name (e.g. "Gummy bears", "Wine Gums", "Fizzies", "Black balls"), supplier_id
  (nullable — who the business buys this bulk candy from), unit_of_purchase (e.g.
  "kg", "carton") if raw-stock tracking is enabled (see below).

Because this is a real many-products-to-one-filling relationship (the source data
shows, for example, several different novelty SKUs all built on "Wine Gums" or "Black
balls"), the link must actually be *used*, not just displayed:

- **Master Connect must support a "filling rollup" view**: given a date range or a
  current-orders snapshot, show total units needed per filling across every product
  that uses it (e.g. "Wine Gums: 340 units needed this week, across 6 SKUs"). This is
  the actual business value of linking `Product` to `Filling` instead of storing the
  candy name as a free-text field per product — it turns "how much Wine Gums do I need
  to buy" into one query instead of manual cross-referencing.
- **Wholesale portal and Master Connect product browsing should support filtering/
  grouping by filling**, not just by range, since a buyer or Molly may think in terms
  of "show me everything that uses Fizzies."

**FillingInventory** (raw/bulk candy stock, separate from finished-good
`InventoryItem`) — recommended as a real table, not just an assumption, given how many
SKUs share a filling: this is the only way to answer "do we have enough Wine Gums on
hand for what's queued" without manually adding up every downstream product's stock.
- id, filling_id, quantity_on_hand (in `unit_of_purchase`, e.g. kg or cartons),
  portions_per_purchase_unit (how many finished product units — jars/bottles/tins —
  one purchase unit of this filling fills; e.g. "1 × 5kg bag of Wine Gums fills 40
  bottles"; nullable, defaults to a 1:1 assumption if the real conversion isn't known
  yet), reorder_threshold, last_counted_at.
  CONFIRM WITH USER whether they currently track this at all today (it may be informal/
  on paper) — if not, this table can ship as a lightweight addition Molly starts using
  once the platform is live, rather than requiring a full stocktake before launch. The
  conversion factor doesn't need to be accurate on day one — decrementing 1:1 by
  finished-unit count is a safe default that Molly can refine per filling once real
  ratios are known.

**Every order decrements `FillingInventory`, not just `InventoryItem`.** When an order
line item consumes N units of a product, that's N "portions" of that product's filling
consumed — convert via `portions_per_purchase_unit` and decrement
`FillingInventory.quantity_on_hand` at the same point in the order lifecycle that
`InventoryItem` is decremented (Section 13). This is what actually lets Master Connect
warn "you're about to run out of Wine Gums" *before* it becomes a fulfillment problem,
rather than just after a finished-jar count hits zero.

**Product**
- id, sku (nullable — seasonal items may not have one yet), barcode (nullable),
  name, range_id, packaging_type (`BOTTLE` | `JAR` | `TIN` | `STAND`), filling_id
  (nullable — Stands and some seasonal items have none), min_order_qty (default 1),
  image_blob_url, active, discontinued (bool — the source data flags several SKUs
  "future discontinued"), **wholesale_visible** (bool, default false — see below).

### 5.1.1 One catalog, not two — how a new product reaches the wholesale portal

Molly must be able to add a brand-new product from her own inventory view and have it
simply *appear* in the wholesale portal — never a separate "now also add it to the
portal" step. There is exactly one `Product` table (Section 5.1); the portal is a
filtered view over it, not a separate catalog that needs manual syncing.

- **Add Product form (Master Connect / Molly's Ops)**: name, range (pick existing or
  create new inline), packaging type, filling (pick existing from the `Filling`
  lookup, or type a new one to create it inline — this must be fast, since new
  novelty products on existing fillings are the common case), min order qty, price
  (base + any per-tier overrides), image upload (Vercel Blob), SKU/barcode
  (**optional at creation** — many real rows in the source data don't have one yet;
  the product can be created, priced, and even sold before a code is assigned), and a
  **"Show in wholesale portal" toggle**.
- The moment `wholesale_visible = true` (and `active = true`), the product appears in
  the wholesale catalog automatically — the wholesale portal's product-list query is
  simply `WHERE active = true AND wholesale_visible = true`, nothing else. No
  duplicate data entry, no export/import step, no separate "publish" pipeline.
- ASSUMPTION: `wholesale_visible` defaults to `false` on creation, so Molly can add a
  product, set its price and image, and only flip it visible when it's actually ready
  to sell — CONFIRM WITH USER if new products should instead default to visible
  immediately.
- This same toggle is independent of Shopify visibility — a product can be
  wholesale-only, retail-only, or both. Retail-side Shopify listing is managed in
  Shopify itself, as today; this platform does not push new products *to* Shopify
  (Section 6.1 covers the reverse — pulling Shopify orders in).

### 5.2 Label & packaging compliance tracking (new — discovered from the business's
own data, not in the original planning notes)

The business is *actively* tracking, per SKU, whether the printed label's regulatory
content is correct, and how many pre-printed labels remain in stock. This is a live
operational workflow and deserves a first-class view in Master Connect, not just a
buried column on the Product table — treat it as equal in importance to inventory
tracking.

**LabelComplianceRecord**
- id, product_id, allergen_status (`CORRECT` | `NEEDS_CHANGE_URGENT` |
  `NEEDS_CHANGE_NON_URGENT`), allergen_notes (free text — e.g. "contains bee pollen,
  add allergy warning"), address_status (`CORRECT` | `INCORRECT`),
  country_of_origin_status (`CORRECT` | `INCORRECT`), nutrition_box_status
  (`CORRECT` | `NEEDS_COLUMN_ADDED` | `INCORRECT`), labels_in_stock (integer, nullable
  — how many pre-printed labels are currently on hand for this SKU), urgency
  (`TOP_PRIORITY_URGENT` | `URGENT_CHANGE_NEEDED` | `CHANGE_NEEDED_NOT_URGENT` |
  `NO_CHANGE_NEEDED`), last_reviewed_at.

This feeds two things in Master Connect: (1) a compliance worklist sorted by urgency,
so label reprints get prioritized correctly, and (2) a low-label-stock alert similar
to low-inventory alerts, since running out of a compliant printed label blocks
fulfillment even if the underlying candy stock is fine.

### 5.3 Core operational entities

**User** (internal staff — Molly, admin, employees)
- id, email, name, role (`OWNER_ADMIN` | `OPS_MANAGER` | `EMPLOYEE`), password_hash or
  magic-link only, active, created_at.

**WholesaleCustomer**
- id, company_name, contact_name, email, phone, region (`NZ` | `AU`), pricing_tier_id,
  shopify_customer_id (nullable, for cross-reference), created_at.

**PricingTier**
- id, name, region, discount/rate rules (jsonb or a related PricingTierProduct table
  for per-SKU custom pricing).

**InventoryItem**
- id, product_id, quantity_on_hand, reorder_threshold, recommended_reorder_qty,
  supplier_id, last_counted_at, location (if multi-warehouse).

**Supplier**
- id, name, contact_email, contact_phone, lead_time_days, notes.

**Order**
- id, order_number, source (`SHOPIFY` | `WHOLESALE_PORTAL`), wholesale_customer_id
  (nullable), shopify_order_id (nullable), region (`NZ` | `AU`), status (see state
  machine, Section 13), payment_phase (`INVOICE` | `PORTAL_PAYMENT`), payment_status,
  total_amount, currency, placed_at, created_at, updated_at.

**OrderLineItem**
- id, order_id, product_id, quantity, unit_price. Enforce `quantity >=
  product.min_order_qty` at order-placement time in the wholesale portal (Treatmints
  need 4+ per the source data).

**OrderTask** (this is what drives the Employee Floor App)
- id, order_id, stage (`LABELLING` | `PACKING` | `DISPATCH`), status
  (`PENDING` | `IN_PROGRESS` | `DONE`), assigned_employee_id (nullable — can be
  unassigned/"first to grab it"), started_at, completed_at.
  One row per order per stage, created automatically when an order is ingested.

**OrderTaskLineItem** (enables product-batched labelling — see Section 11)
- id, order_task_id (FK — only populated for `LABELLING`-stage `OrderTask` rows),
  order_line_item_id (FK), status (`PENDING` | `DONE`), completed_at (nullable).
  Created automatically alongside each `LABELLING` `OrderTask`, one row per line item
  on that order. This is what lets labelling work be reorganized by product across
  many orders at once (Section 11) while still being able to tell, per order, whether
  every line item has actually been labelled — which is what flips the parent
  `OrderTask.status` to `DONE` and unlocks that order's `PACKING` task. `PACKING` and
  `DISPATCH` don't need this table — they stay whole-task completions, since packing
  and dispatch are inherently per-order activities, not batchable across orders.

**EmployeeLabourLog**
- id, employee_id, date, hours_worked, order_task_id (nullable, for per-task costing),
  notes. Feeds productivity/costing tracking.

**SalesLead** (Molly's corporate gifting pipeline — schema matches the business's real
lead tracker exactly, not a generic CRM guess)
- id, lead_number (display id, e.g. "1001"), contact_name, company_name, segment enum
  (`HR_WELLBEING_CULTURE` | `EVENT_MARKETING_AGENCY` | `SALES_TEAM_CLIENT_GIFTING` |
  `OTHER`), source (free text, e.g. "LinkedIn"), email (nullable), phone (nullable),
  stage enum (`SOURCE` | `QUALIFY` | `OUTREACH_SENT` | `NURTURE` |
  `PROPOSAL_SAMPLE_SENT` | `CLOSED_WON` | `CLOSED_LOST` | `RETAIN_REFERRAL`) — this is
  an 8-stage pipeline, not the generic 5-stage one assumed earlier; order matters for
  the kanban board and matches the business's existing spreadsheet exactly, don't
  renumber or rename these, next_action_date (nullable), next_action (free text,
  nullable), est_order_value_nzd (decimal, nullable), notes (nullable), owner_user_id
  (FK), timestamps (`date_added` doubles as `created_at`; add a separate
  `last_touch_date` field since that's tracked independently of `updated_at` in the
  real data — a note can be edited without that counting as a "touch").

**EmailTemplate** (Sweet Disorder's real, send-ready corporate outreach copy — not
placeholder text; source content is provided separately for the seed script)
- id, category enum (`EDM_SEQUENCE` | `COLD_OUTREACH` | `RESPONSE_SCENARIO`),
  sequence_position (int, nullable — EDM emails are numbered 1–5 and sent in order;
  null for outreach/response templates, which are situational not sequential),
  segment enum (`HR_WELLBEING_CULTURE` | `EVENT_MARKETING_AGENCY` |
  `SALES_TEAM_CLIENT_GIFTING` | `OTHER` | `ALL_SEGMENTS`, nullable — several templates
  are segment-specific, EDM copy is written for a mixed list with optional per-segment
  subject-line alternates), scenario_name (e.g. "No response — Follow-up 1",
  "Objection: budget/cost" — nullable, only for `RESPONSE_SCENARIO`), send_timing_notes
  (free text, e.g. "Day 5–7" or "~4–5 days after initial outreach, no reply"), subject,
  subject_alt_hr (nullable), subject_alt_agency (nullable), subject_alt_sales
  (nullable — EDM 4 specifically has three alternate subject lines per segment),
  preheader (nullable), body (text), cta_label (nullable), notes (nullable —
  e.g. EDM 4's note to check the gifting calendar for timing).
  This must be genuinely usable from Molly's dashboard: copy-to-clipboard at minimum,
  with merge-token placeholders (`[First Name]`, `[Company]`, `[link]`) left intact
  for her to fill in or wire into Brevo's own merge-tag syntax later — do not
  pre-resolve or strip the brackets.

**GiftingOccasion** (the seasonal calendar that times EDM 4 and cold outreach —
sourced from the business's real "NZ Gifting Calendar")
- id, occasion_name, approx_timing (free text — several dates shift yearly and the
  source data says so explicitly, don't force these into rigid calendar dates),
  trigger_by (free text, e.g. "Early March" — when outreach/EDM 4 should go out
  relative to the occasion), notes, is_always_on (bool — one row, "Work Anniversaries
  / Milestones," is explicitly ongoing/per-client rather than seasonal).

**IntegrationSyncLog**
- id, integration (`SHOPIFY` | `XERO` | `KLAVIYO` | `BREVO`), direction, status,
  payload_summary, error_message, created_at. Essential for debugging sync issues —
  build this early, not as an afterthought.

**MagicLinkToken**
- id, email, token_hash, expires_at, used_at, wholesale_customer_id.

Add standard `created_at`/`updated_at` to every table. Use Postgres enums or Prisma
enums for all status fields — do not use free-text strings for statuses.

---

## 6. Integrations

### 6.1 Shopify
- Pull orders via webhook (`orders/create`, `orders/updated`, `orders/fulfilled`) —
  register webhooks pointing at a Next.js API route (`/api/webhooks/shopify`), verify
  HMAC signature.
- Also sync inventory levels if Shopify is the source of truth for retail stock, or
  treat `InventoryItem` as the master and push *to* Shopify — CONFIRM WITH USER which
  direction inventory truth flows (Shopify → prod-data, or prod-data → Shopify, or
  both reconciled).
- Map Shopify line items to internal `Product` by SKU code. Note the real catalog has
  several products with no SKU/barcode yet (seasonal, in-progress items) — these
  cannot be matched against Shopify by SKU until one is assigned; flag unmatched line
  items in `IntegrationSyncLog` rather than silently dropping them.

### 6.2 Xero
- Notes describe: "when there is an order, it is emailed through as a spreadsheet in
  Xero-format to Molly." Build this as: on order creation, generate a CSV/XLSX in
  Xero's bank-import or invoice-import column format, store it in Vercel Blob, and
  email it via Brevo to Molly (and/or push directly via the Xero API if going further
  than "email a spreadsheet" — CONFIRM WITH USER whether direct Xero API integration
  is wanted now or the manual-import spreadsheet is the actual Phase 1 target. Default
  to the spreadsheet-email approach).

### 6.3 Klaviyo
- Dashboard shortcut/status widget on Master Connect showing sync health; optionally
  push new wholesale customer emails into a Klaviyo list. See ASSUMPTION in Section 4.

### 6.4 Brevo (transactional email)
Build one internal `sendTransactionalEmail()` service wrapping the Brevo API, used for:
- Magic-link login emails (wholesale customers + optionally staff).
- Order confirmation (auto-confirmation) to wholesale customers.
- Order dispatched notification to wholesale customers.
- Low-stock / reorder-recommended alert to Molly/admin.
- Label-compliance urgency alert to Molly/admin (new — see Section 5.2).
- Xero-format spreadsheet delivery to Molly (Section 6.2).
- Daily/next-task digest to employees is *not* needed — the floor app is real-time,
  not email-driven.

### 6.5 Vercel Blob
- Product images, generated Xero export files, printed-label artwork/proofs, any
  packing slip / dispatch label PDFs.
- Store only the Blob URL in Postgres, never binary blobs in the DB.

---

## 7. Authentication & authorization

Three distinct auth flows, one shared `User`/session model where possible:

1. **Wholesale customers** — passwordless magic link only. Flow: enter email → Brevo
   sends link → token verified → session cookie scoped to that `WholesaleCustomer`.
   No passwords, ever, for this role.
2. **Internal staff (Molly/Admin)** — magic link, for consistency with the wholesale
   flow and to avoid building two separate auth systems — CONFIRM WITH USER if
   email+password is preferred instead.
3. **Employees (floor app)** — needs to be fast on a shared shop-floor tablet, so a
   full login per person may be too slow. ASSUMPTION: a lightweight PIN-based login
   (4-digit PIN tied to a `User`) is more realistic than full email auth — CONFIRM
   WITH USER how employees will actually authenticate on the floor (PIN, badge scan,
   shared login + manual name-select per task, etc.). Default recommendation: PIN
   login.

Role-based access control (RBAC): every API route checks role. Wholesale customers can
only ever see their own orders/pricing — enforce this at the query level (always scope
by `wholesale_customer_id`), not just in the UI.

---

## 8. Application 1 — Wholesale Customer Portal

**Users:** external B2B customers (NZ + AU).

**Must-haves:**
- Magic-link login, no password.
- Browse the real product catalog (Section 5.1) by range, with the customer's own
  negotiated pricing tier applied automatically (never show list price if a custom
  tier exists). Show packaging type and filling on each product card, since wholesale
  buyers order by the case/range, not just by novelty name. Support filtering/
  browsing by filling type (Section 5.1) in addition to by range.
- Enforce each SKU's minimum order quantity at checkout (e.g. Treatmints require 4+).
- Place a new order; support splitting a single order across NZ and AU destinations
  if the customer operates in both, with custom pricing per region.
- View order history and current status per order (mapped from `OrderTask` stages —
  show a simple "Labelling → Packing → Dispatched" progress indicator, not internal
  task detail).
- "Recommended reorder" surfaced on the dashboard: compute from historical order
  cadence/quantity per product per customer (simple heuristic: average interval ×
  average quantity is fine for v1 — do not over-engineer a forecasting model unless
  asked).
- Auto order-confirmation email on submit (via Brevo).
- Phase 1: order ends in "awaiting invoice" status, no payment collected in-app —
  Molly invoices via Xero separately. Phase 2 (future): in-portal payment.

**UX bar:** must be "SUPER easy." Minimal steps to reorder (ideally "reorder last
order" one-click, then adjust quantities), large tap targets, mobile-friendly since
buyers may order from phones.

---

## 9. Application 2 — Master Connect Dashboard (Dashboard #1)

**Users:** owner/admin only (highest privilege).

**Must-haves:**
- Home view = "Master Connect": tiles/cards linking out to and summarizing status of
  Shopify, Wholesale portal, Sales pipeline, Klaviyo, Xero, and internal
  systems/records.
- **Master inventory record**: live stock levels per product, supplier info,
  reorder threshold and recommended reorder quantity, manual stock adjustment with
  audit trail.
- **Filling rollup view** (Section 5.1): total units-needed-per-filling across every
  product that shares it, plus (if `FillingInventory` is enabled) current bulk-candy
  stock on hand per filling versus what's queued in open orders — this is the primary
  payoff of modeling `Filling` as a linked entity rather than a text field.
- **Label & packaging compliance tracker** (Section 5.2): worklist of all SKUs sorted
  by urgency (Top priority urgent → No change needed), showing allergen/address/
  country-of-origin/nutrition status per SKU and current pre-printed label stock.
  This is a genuinely active workflow in the business today — treat it as a primary
  Master Connect feature, not a footnote.
- **Order overview across both channels** (Shopify + Wholesale) in one table/board,
  filterable by status/region/source.
- **Employee productivity/costing**: view logged labour hours per employee per day,
  and (if per-task labour logging is enabled) cost-per-order rollups.
- **Integration health**: surface `IntegrationSyncLog` errors prominently — this
  dashboard is the place things get debugged when a Shopify webhook fails, a product
  can't be matched by SKU, or an email bounces.
- Full CRUD on products (including range, packaging type, filling, SKU/barcode once
  assigned), suppliers, pricing tiers, and wholesale customer accounts.

---

## 10. Application 3 — Molly's Ops Dashboard ("Prod Dash")

**Users:** Molly / ops manager role (same app as #9 but role-gated to a curated view,
per the recommendation in Section 3 — build as a separate route/nav within the same
Next.js app unless CONFIRM WITH USER says otherwise).

**Role clarification:** Molly is the business's founder/operator, not a distinct
"ops manager" employee separate from ownership — CONFIRM WITH USER, but the working
assumption is Molly holds `OWNER_ADMIN` and can reach full Master Connect when she
needs it, while this simplified dashboard is the surface she lives in day to day.
Product and inventory management therefore belong **here**, not gated behind a
separate admin-only screen she'd rarely open.

### 10.1 Overview page (the hub Molly lands on)

Molly's dashboard is not one long scrolling page — it's a **home/overview screen with
one tile per functional dashboard**, mirroring the tile pattern already used for
Master Connect (Section 9) but scoped to what Molly actually needs day to day. Each
tile shows a live at-a-glance number and opens into its own focused sub-dashboard.
This is the landing page she sees immediately after logging in.

| Tile | At-a-glance number | Opens into |
|---|---|---|
| Orders | "X orders awaiting action today" | 10.2 Orders dashboard |
| Inventory & products | "Y products low on stock" | 10.3 Inventory & products dashboard |
| Filling & reorder | "Z fillings need reordering" | 10.4 Filling & reorder dashboard |
| Label compliance | "N items top-priority urgent" | 10.5 Label compliance dashboard |
| Sales & marketing | "M leads awaiting follow-up" | 10.6 Sales & marketing dashboard |

The tile grid itself must stay simple — numbers and a label, nothing more — so the
"don't overwhelm Molly" requirement is satisfied at the very first screen she sees;
detail and action happen one level in, inside each named sub-dashboard below.

### 10.2 Orders dashboard
- Order + packing status overview across all channels (Shopify + Wholesale),
  read/manage but simplified compared to the full admin table in Master Connect
  (fewer columns, action-oriented — e.g. "orders waiting on dispatch today," "orders
  stuck at labelling").

### 10.3 Inventory & products dashboard
- **Product management, including the "Add Product" flow** (Section 5.1.1): create a
  new product (name, range, packaging type, filling — existing or quick-add new —
  price, min order qty, image, SKU/barcode optional), and toggle it visible in the
  wholesale portal. This is core daily-use functionality, not an occasional admin
  task, so it lives here even though the same underlying data is also visible/editable
  from the full Master Connect view.
- Finished-good stock levels (`InventoryItem`) with manual adjustment.

### 10.4 Filling & reorder dashboard
- **Filling rollup view** (Section 5.1): total units needed per filling across every
  product that shares it, plus current `FillingInventory` stock versus what's queued
  in open orders — the actual "do I need to buy more Wine Gums this week" answer.
- Reorder alerts for both `InventoryItem` and `FillingInventory` in one place.

### 10.5 Label compliance dashboard
- The compliance worklist from Section 5.2/12, sorted by urgency
  (`TOP_PRIORITY_URGENT` → `URGENT_CHANGE_NEEDED` → `CHANGE_NEEDED_NOT_URGENT` →
  `NO_CHANGE_NEEDED`), with pre-printed label stock per SKU.

### 10.6 Sales & marketing dashboard

This is a full corporate-gifting CRM built around Sweet Disorder's actual existing
process, not a generic leads list — the business already runs bespoke corporate
gifting outreach (client gifts, staff wellbeing, event swag) with a defined pipeline,
segment-specific messaging, and a seasonal outreach calendar. This dashboard should
make that process easier to run, not replace it with something unfamiliar.

**Pipeline view**
- Kanban board across the real 8-stage pipeline, in order: `SOURCE` → `QUALIFY` →
  `OUTREACH_SENT` → `NURTURE` → `PROPOSAL_SAMPLE_SENT` → `CLOSED_WON` /
  `CLOSED_LOST` → `RETAIN_REFERRAL`. Each `SalesLead` card shows company, contact,
  segment, est. order value, and next action date.
- A sortable table view as an alternative to the kanban, sorted by `next_action_date`
  ascending by default — "who do I need to follow up with next" is the most common
  question, not "what does the funnel shape look like."
- **Pipeline summary metrics**, computed live (mirrors the business's existing
  spreadsheet dashboard exactly, so numbers match what Molly is used to checking):
  total leads, total pipeline value (sum of `est_order_value_nzd` across all leads not
  in `CLOSED_WON`/`CLOSED_LOST`), closed-won value, win rate (`CLOSED_WON` count ÷
  (`CLOSED_WON` + `CLOSED_LOST`) count), leads-by-stage breakdown, leads-by-segment
  breakdown.

**Templates library**
- Browse all `EmailTemplate` rows, filterable by category (EDM sequence / cold
  outreach / response scenario) and by segment.
- EDM sequence templates display in their numbered order (1–5) with their send-timing
  note (e.g. "Day 5–7") so Molly can see the nurture sequence as a sequence, not a
  jumbled list.
- Cold outreach templates are grouped by segment (HR/Wellbeing, Agency, Sales Team).
- Response-scenario templates are searchable/browsable by scenario name (e.g. "Reply
  raises price as a concern") so Molly can find the right reply fast when she's mid-
  conversation with a lead, not hunting through a long document.
- **Copy-to-clipboard on every template**, merge tokens (`[First Name]`, `[Company]`,
  `[link]`, etc.) left intact and clearly highlighted — this is send-ready copy the
  business already wrote, not something to regenerate or paraphrase.
- Linking a template's usage back to a specific `SalesLead` (e.g. logging "sent EDM 2
  to this lead on this date") is a nice-to-have, not required for v1 — CONFIRM WITH
  USER if this level of tracking is wanted, since it would mean adding a join table
  (`SalesLead` ↔ `EmailTemplate` ↔ sent date) rather than treating templates as a
  read-only reference library.

**Upcoming gifting occasions**
- Surface `GiftingOccasion` rows sorted by proximity to today (best-effort given the
  data is approximate, per-year-shifting dates by design — don't try to compute exact
  exact calendar dates from free-text fields like "Late September"). At minimum, flag
  which occasion is coming up next and its `trigger_by` note, since that's what
  actually decides when Molly needs to send EDM 4 or start a fresh outreach push.
- The "Work Anniversaries / Milestones" row (`is_always_on = true`) displays
  separately as a standing reminder rather than competing for "next occasion" ranking.

**Corporate one-pager**
- The business's existing one-page PDF/collateral (sourced from the business's real
  one-pager content) should be stored in Vercel Blob and made available as a
  downloadable/shareable link from this dashboard — Molly attaches or links it during
  outreach (e.g. Outreach Response 2.3, "here's a quick overview... [attach/link]").
  This is static reference content, not something the platform needs to regenerate or
  template — just host it and make it easy to grab.

### 10.7 What stays out of Molly's dashboard entirely
- Integration health/debugging (`IntegrationSyncLog` detail) and multi-user staff
  account management stay in the full Master Connect view (Section 9) — not because
  Molly can't see them, but because they're not everyday tools and would clutter the
  hub. She can still reach Master Connect directly since she holds `OWNER_ADMIN`; it's
  simply not what she lands on.

---

## 11. Application 4 — Employee Floor App

**Users:** production/warehouse employees.

**Must-haves, general:**
- After login (see Section 7), employee sees **one screen**: the next task available
  to them, nothing else. No order backlog, no historic data, no navigation clutter.
- Should feel closer to a simple checklist/game than "enterprise software" — big
  buttons, instant feedback, maybe a small completion counter for the day.
- Employees should **not** see other employees' task history or unrelated order
  detail — keep the surface area minimal by design, not just by permission.
- Order stage flow strictly: **Labelling → Packing → Dispatch**. An order's Packing
  task must not be claimable until every line item on that order's Labelling task is
  done; Dispatch not until Packing is done. Enforce this in the API, not just the UI.

**Labelling & filling is batched by product across orders — not one order at a
time.** This is a deliberate efficiency requirement, not a simplification to walk
back: physically filling and labelling is far faster done as "fill 50 Bear Hugs,
then move to the next product" than stopping and switching products every time an
order changes. So the Labelling screen works differently from Packing/Dispatch:

- The screen aggregates every `OrderTaskLineItem` currently `PENDING` across **all**
  orders' `LABELLING` tasks, grouped by product, with quantities summed. If ten
  pending orders between them need 50 Bear Hugs, 30 You Rock, and 12 Hangry Pills, the
  employee sees one product-group at a time:
  ```
  Labelling & filling
  Bear Hugs — Bottle — Gummy bears
  50 needed across 6 orders
  [ Mark this batch done ]
  ```
  pulling packaging type and filling live from `Product`/`Filling`, exactly as before.
- Tapping "Mark this batch done" marks **every** contributing `OrderTaskLineItem` row
  as `DONE` in one action (the employee doesn't work order-by-order within the batch —
  once the physical jars are filled and labelled, they're done for every order that
  needed one). The service then checks each affected order: if all of that order's
  `OrderTaskLineItem` rows are now `DONE`, it flips that order's `LABELLING`
  `OrderTask.status` to `DONE`, which is what unlocks `PACKING` for that specific
  order — an order can "finish labelling" quietly, mid-batch, as soon as its own
  line items happen to be covered, without the employee needing to track that
  manually.
- After a batch is marked done, the next product-group with remaining pending
  quantity is surfaced. When no products have pending labelling quantity left, show
  the "no tasks right now" state.
- ASSUMPTION: the labelling queue is simply "every currently-pending `LABELLING`
  task," not a formally scheduled/curated "today's batch" that Molly explicitly
  selects in advance — CONFIRM WITH USER if a manual batch-selection step is wanted
  later (e.g. to deliberately hold back an order that shouldn't be prepped yet even
  though it's technically pending). The always-on queue is simpler and matches "ten
  orders need to be done today" naturally as long as orders are labelled close to
  when they're placed.

**Packing and Dispatch stay per-order, exactly as originally specified** — packing
is assembling one specific customer's box from already-labelled product, so it can't
be batched across orders the way labelling can:
- One order at a time, all its line items shown together (now already labelled):
  ```
  Order #1042 — Packing
  ☐ 4 × Bear Hugs      — Bottle — Gummy bears
  ☐ 5 × You Rock       — Bottle — Mixed rock candy
  ☐ 2 × Hangry Pills    — Bottle — Strawberry rock
  [ Mark all done ]
  ```
- One "Mark all done" action completes the whole `PACKING` (or `DISPATCH`)
  `OrderTask` directly — no `OrderTaskLineItem` involved for these two stages, that
  table exists only to support labelling's cross-order batching.
- On completing `DISPATCH`, also set `Order.status = DISPATCHED`.

---

## 12. Label & packaging compliance workflow (cross-cutting)

This isn't a separate application, but it touches two of the four surfaces and is
important enough to call out on its own:

- **Master Connect** owns the full compliance worklist and editing (Section 9).
- **Employee Floor App** should optionally surface a hard stop or warning if a product
  scheduled for labelling has zero `labels_in_stock` recorded — an employee shouldn't
  discover mid-task that there are no compliant labels to apply. ASSUMPTION: this is a
  soft warning banner rather than a hard block in v1, since label stock counts in the
  source data are frequently blank/unknown — CONFIRM WITH USER whether label-stock
  tracking is accurate/current enough to hard-block fulfillment on it yet.
- Urgency levels from the source data map directly to a sort order in the Master
  Connect worklist: `TOP_PRIORITY_URGENT` → `URGENT_CHANGE_NEEDED` →
  `CHANGE_NEEDED_NOT_URGENT` → `NO_CHANGE_NEEDED`.

---

## 13. Order lifecycle (ties everything together)

```
1. Order created
   - via Shopify webhook, OR
   - via Wholesale Portal checkout (min-order-qty validated per line item)
   → Order + OrderLineItems rows created
   → Auto-confirmation email sent to customer (Brevo) [wholesale only, or both]
   → Xero-format spreadsheet generated + emailed to Molly (Brevo)
   → OrderTask rows auto-created for stages: LABELLING, PACKING, DISPATCH (PENDING)
   → OrderTaskLineItem rows auto-created for the LABELLING task, one per line item
     (PENDING) — this is what enables cross-order product batching in step 2

2. Employee floor app: Labelling & filling — batched by product, not by order
   → Screen aggregates all PENDING OrderTaskLineItem rows across every order's
     LABELLING task, grouped by product (e.g. "Bear Hugs: 50 needed across 6 orders")
   → Employee marks a product batch done → every contributing OrderTaskLineItem
     flips to DONE in one action
   → For each order touched by that batch, check: are all its OrderTaskLineItem rows
     now DONE? If so, that order's LABELLING OrderTask.status → DONE, and PACKING
     becomes claimable for that specific order — this can happen quietly, mid-batch,
     for whichever orders happen to be fully covered first, not in a single batch step

3. Employee floor app: Packing — per order, as soon as that order's LABELLING is DONE
   → Shows one order's line items together (already labelled)
   → Employee marks DONE → DISPATCH task becomes claimable for that order

4. Employee floor app: Dispatch — per order
   → Employee marks DONE → Order.status = DISPATCHED
   → Dispatch notification email sent to customer (Brevo)
   → InventoryItem AND FillingInventory both decremented together, at the same point
     in the lifecycle (if not already decremented at order time — decide once, be
     consistent: decrement at order creation to protect against overselling, or at
     dispatch to reflect physical reality — CONFIRM WITH USER; default to decrementing
     at order creation with a manual stock-adjustment safety valve in Master Connect).
     Decrementing only `InventoryItem` and forgetting `FillingInventory` would silently
     break the "warn before we run out of Wine Gums" feature (Section 5.1) — both
     updates belong in the same transaction/service call, not two separate code paths.

5. Throughout: Master Connect dashboard shows live order status across all channels
   plus the label-compliance worklist; Molly's Ops dashboard shows the simplified
   "what's outstanding today" view; Wholesale portal shows the customer their own
   order's progress.
```

---

## 14. Notifications summary (Brevo templates to build)

| Trigger | Recipient | Content |
|---|---|---|
| Magic link requested | Wholesale customer / staff | Login link, short expiry |
| Order placed | Wholesale customer | Confirmation, order summary |
| Order placed | Molly | Xero-format spreadsheet attached/linked |
| Order dispatched | Wholesale customer | Dispatch confirmation |
| Stock below reorder threshold | Owner/Admin, Molly | Item, qty left, supplier, recommended reorder qty |
| Label compliance top-priority item | Owner/Admin, Molly | SKU, what's wrong, current label stock |
| Integration sync failure | Owner/Admin | Which integration, error summary, link to Master Connect |

---

## 15.1 Design system — this is not optional polish, build every stage against it

Every stage so far has been built with zero visual identity — default dark-mode
dev-tool styling, plain text-only buttons, no brand presence. That stops now. Sweet
Disorder has a real, distinctive brand (sweetdisorder.co.nz) — bold, cheeky,
retro-candy-label energy — and this platform should look like it belongs to that
business: genuinely well-designed, not just "themed." Apply the following to
**every** surface (Wholesale Portal, Master Connect, Molly's Dashboard, Employee
Floor App), not just new work going forward — retrofit existing screens as part of
whichever stage touches them next.

**Background & mode — light, not dark:**
- **White (`#FFFFFF`) is the base background across all four surfaces.** No dark
  mode. This is a deliberate choice, not a placeholder default — a bright, clean
  canvas reads as retail-brand-quality and matches the live site, and it's also more
  legible on a shop-floor tablet under warehouse lighting than a dark UI is.
- Use a very light neutral grey (e.g. `#F7F7F5`–`#FAFAFA` range) for subtle section
  separation (page background vs. card background), never a second dark tone.
- Black (`#000000`) is for text and high-contrast accents, not backgrounds.

**Typography** (pulled directly from the live site's CSS):
- Headings: **Francois One** (bold, condensed, uppercase, generous letter-spacing) —
  this is what gives the brand its punchy, shouty-in-a-fun-way personality. Use it for
  page titles, section headers, and the big state messages on the floor app ("No
  tasks right now").
- Body text: **DM Sans** — clean and readable, used for everything else.
- Accent/UI text: **Red Hat Text** where a third weight is useful (e.g. buttons,
  labels) — don't overuse a third typeface, DM Sans covers most UI text fine.
- Headings are uppercase with letter-spacing, not sentence case — matches the site.
- Establish a real type scale (not ad-hoc font sizes per component): something like
  page title / section heading / card title / body / caption, each with a fixed
  size+weight+line-height, reused consistently everywhere.

**Colour — teal is an accent, not a background:**
- Primary brand colour `#108474` (deep teal/jade) is for primary buttons, active/
  selected states, links, and small accent details (icon fills, active tab
  underlines) — used deliberately and sparingly, not painted across large areas.
  It should pop precisely because it's rare on an otherwise white/black/grey canvas.
- Inventory/stock status colours are reserved **only** for actual inventory status,
  nowhere else, so they keep their meaning: in-stock `#3ED660`, low-stock `#EE9441`,
  out-of-stock `#C8C8C8`.
- Error `#8B0000`, success `#006400` — reserved for actual error/success feedback.
- Neutral greys for borders, dividers, secondary text (don't default to pure black
  for everything — use a grey scale for hierarchy, black only for primary text).

**Shape:**
- Buttons, tags, and brand-forward elements (Wholesale Portal especially): **sharp
  corners**, matching the live site's `border-radius: 0` — this is a deliberate
  brand signature, not an oversight.
- Cards and containers on the denser internal surfaces (Master Connect, Molly's
  Dashboard): a small, consistent radius (4–8px) is fine and reads as more refined
  on data-dense screens — but pick one radius value and use it everywhere those
  surfaces need it, never mix radius values arbitrarily.
- Give cards a subtle elevation (a soft shadow or a 1px neutral border), not a flat
  same-tone box with no separation from the page background.

**Iconography — Master Connect and Molly's Dashboard navigate by icon, not text
buttons:**
- Use **lucide-react** (`npm install lucide-react`) as the single icon set across the
  whole platform — consistent stroke width and style, don't mix icon libraries or
  emoji.
- Every navigation tile (Master Connect's six system tiles, Molly's five dashboard
  tiles, the Floor App's three station buttons) pairs an icon with its label — icon
  above or beside the text, not a plain text-only button/link. This is a real
  requirement, not a nice-to-have: a wall of text buttons is exactly what needs
  fixing.
- Suggested icon mapping (swap for a better fit if you find one, but keep it
  consistent and literal, not abstract/decorative):
  - Master Connect: Shopify → `shopping-bag`, Wholesale Portal → `package`,
    Sales Pipeline → `trending-up`, Klaviyo → `mail`, Systems/Records →
    `database`, Xero → `receipt`.
  - Molly's Dashboard: Orders → `clipboard-list`, Inventory & Products →
    `package`, Filling & Reorder → `candy` (lucide has this — perfect literal fit),
    Label Compliance → `tag`, Sales & Marketing → `megaphone`.
  - Floor App stations: Labelling & filling → `tag`, Packing → `package`,
    Dispatch → `truck`.
- Icons should be a single consistent size within each context (e.g. all tile icons
  the same size), coloured black/dark-grey by default, switching to brand teal only
  on hover/active/selected — not a rainbow of different colours per icon.

**Motion & feedback:**
- Buttons and tiles should have a real hover/press state (subtle scale, colour
  shift, or shadow change) — not just a flat colour swap or nothing at all.
- The Floor App's "mark done" actions in particular should feel satisfying to tap —
  brief, confident visual feedback on success (matches the "closer to a game than
  enterprise software" requirement from Section 11).
- Keep motion subtle and fast (150–250ms transitions) — this is about feeling
  polished and responsive, not flashy or slow.

**Practical application per surface:**
- **Wholesale Portal**: closest to the public brand voice of the four surfaces —
  white background, sharp-cornered buttons, generous whitespace, product cards with
  real imagery where available. Should feel like a natural extension of
  sweetdisorder.co.nz itself.
- **Employee Floor App**: white background, huge icon+text tap targets, bold
  Francois One state messages. Prioritize instant legibility and satisfying tap
  feedback over strict brand fidelity — a shop-floor tablet needs to be readable at
  a glance above all else.
- **Master Connect / Molly's Dashboard**: white/light-grey background, icon-led
  navigation tiles (not text links), small-radius cards with subtle elevation for
  data-dense content, teal used precisely for primary actions and active states so
  it stands out rather than blending into a busier layout.

---

## 16. Non-functional requirements

- **Mobile-first** for the Wholesale Portal (buyers order from phones) and the
  Employee Floor App (shop-floor tablets); desktop-first is fine for Master Connect
  and Molly's dashboard but should still be responsive.
- **Role scoping enforced server-side** on every query, not just hidden in the UI.
- **Auditability**: stock adjustments, price overrides, label-compliance status
  changes, and order status changes should be logged with who/when.
- **Resilience**: webhook handlers (Shopify) must be idempotent — a retried webhook
  must not create duplicate orders. Use the external ID (Shopify order id) as a
  uniqueness constraint. Unmatched SKUs (products without a code yet) must be logged,
  not silently dropped.
- **No secrets in the repo** — all API keys (Shopify, Xero, Klaviyo, Brevo, Neon,
  Vercel Blob) via environment variables, documented in `.env.example`.

---

## 17. Recommended build order for Claude Code

Even though this ships as one connected system, build and verify in this order so each
layer is testable before the next depends on it:

1. **Repo scaffold + Neon + Prisma schema** (Section 5) + auth foundation
   (Section 7) with role-based routing skeleton for all four surfaces. Seed the
   database with the real product catalog (Section 5.1) rather than placeholder data.
2. **Core order/inventory data layer + Shopify webhook ingestion** — get real orders
   flowing into `Order`/`OrderLineItem`/`OrderTask` before building any UI on top.
3. **Employee Floor App** — smallest surface, proves the `OrderTask` stage-gating
   logic end-to-end. Good first UI to validate the model.
4. **Wholesale Portal** — magic link auth, catalog + pricing tiers, order placement
   with min-order-qty enforcement, order history/status.
4.5. **Design system pass** (Section 15.1) — apply real typography, colour, and shape
   to every surface built so far (stages 1–4), before adding more surfaces on top of
   unstyled screens. Cheaper to establish the shared design tokens/components now,
   once, than to retrofit four increasingly-large surfaces separately later.
5. **Master Connect Dashboard** — inventory management, label-compliance worklist,
   integration status, employee productivity views, full order overview. Build
   against the design system from the start.
6. **Molly's Ops Dashboard** — simplified views/sales pipeline layered on top of data
   that already exists by this point. Build against the design system from the start.
7. **Xero export + Brevo email wiring + Klaviyo link-out** — integrate once the core
   flows are proven, so test emails aren't firing against half-built data.
8. **Phase 2 (later, separate effort): in-portal payments.**

---

## 18. Repo structure & conventions (suggested)

```
/app
  /(wholesale)/...       # wholesale portal routes — served on portal.*
  /(admin)/...           # Master Connect (owner/admin) — served on admin.*
  /(ops)/...             # Molly's ops dashboard — served on dashboard.*
  /(floor)/...           # employee floor app — served on floor.*
  /api
    /webhooks/shopify
    /auth/magic-link
    /orders
    /inventory
    /label-compliance
    /tasks
middleware.ts             # host-based subdomain → route group rewrite (Section 3.1)
/lib
  /db (Prisma client)
  /email (Brevo wrapper)
  /integrations (shopify.ts, xero.ts, klaviyo.ts)
  /auth
  /subdomains.ts          # single source of truth mapping hostnames to route groups
/prisma
  schema.prisma
  seed.ts                # loads the real product catalog
/docs
  brief.md (this file)
```

- Conventional commits; one PR per numbered stage in Section 16 where practical.
- `.env.example` listing every required variable (see Section 18) with comments.

---

## 19. Environment variables checklist

```
DATABASE_URL=              # Neon connection string
DIRECT_URL=                # Neon direct connection (for Prisma migrations)
BLOB_READ_WRITE_TOKEN=     # Vercel Blob
BREVO_API_KEY=
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_API_TOKEN=
SHOPIFY_WEBHOOK_SECRET=
XERO_CLIENT_ID=            # only if going beyond spreadsheet-email approach
XERO_CLIENT_SECRET=
KLAVIYO_API_KEY=           # only if two-way sync is confirmed
AUTH_SECRET=               # session/JWT signing

# Per-surface base URLs (Section 3.1) — replace APP_BASE_URL with one per subdomain
# so links generated for one surface never point at another. Before DNS is live,
# these can point at Vercel's own preview/production URL; swap to the real
# subdomains once DNS is configured — no code changes needed either way.
WHOLESALE_APP_URL=         # e.g. https://portal.sweetdisorder.co.nz
ADMIN_APP_URL=             # e.g. https://admin.sweetdisorder.co.nz
OPS_APP_URL=               # e.g. https://dashboard.sweetdisorder.co.nz
FLOOR_APP_URL=             # e.g. https://floor.sweetdisorder.co.nz
```

---

## 20. Definition of done (per stage)

- **Data layer**: schema migrated on Neon; seed script loads the real ~100-SKU catalog
  across all five ranges, with one wholesale customer, one employee, one admin user.
- **Shopify ingestion**: a test webhook payload creates an `Order` with correct line
  items and auto-generates the three `OrderTask` rows; an unmatched SKU is logged, not
  dropped.
- **Floor app**: completing Labelling makes Packing claimable and not before;
  completing Dispatch flips `Order.status` and fires the dispatch email; the task
  screen correctly shows packaging type + filling for the SKU being worked.
- **Wholesale portal**: a magic-link login works end-to-end; an order placed shows up
  immediately in Master Connect's order overview; pricing shown matches the
  customer's tier, not list price; a Treatmints line item under 4 units is rejected.
- **Master Connect**: inventory levels reflect order activity; the label-compliance
  worklist correctly sorts by urgency; integration errors (simulate a failed webhook)
  appear in the sync log view.
- **Molly's dashboard**: overview page tile counts match live data (orders awaiting
  action, low-stock products, fillings needing reorder, top-priority compliance items,
  leads awaiting follow-up); each tile opens into its correct sub-dashboard
  (Section 10.1); a product added via 10.3 immediately appears in the wholesale portal
  once toggled visible.
- **Sales & marketing dashboard**: pipeline kanban across all 8 real stages persists
  stage changes and matches the summary metrics (total pipeline value, win rate,
  stage/segment breakdowns); all seeded `EmailTemplate` rows are browsable and
  copy-to-clipboard works with merge tokens intact; upcoming gifting occasions surface
  correctly sorted.
- **Subdomain routing**: hitting each of the four subdomains (Section 3.1) — or their
  pre-DNS Vercel equivalents — serves the correct surface via `middleware.ts`, and
  every generated link (magic-link email, dispatch notification, "view order" link)
  points at the subdomain matching its own surface, never a different one.

---

## 21. Open questions to confirm with the business owner before/while building

1. Raw-ingredient (loose lolly/filling) inventory: `FillingInventory` is recommended
   in Section 5.1 given how many SKUs share one filling, but CONFIRM whether the
   business tracks this today (even informally) so seed data/launch scope is realistic
   — it can also ship as an empty table Molly starts populating post-launch.
2. Direction of inventory truth: Shopify → prod-data, prod-data → Shopify, or both
   reconciled?
3. Xero integration depth: is an emailed spreadsheet the actual Phase 1 target, or is
   direct Xero API integration wanted now?
4. Klaviyo: dashboard link-out only, or does customer data need to sync into Klaviyo
   lists/flows?
5. Staff auth: magic link for Molly/Admin too, or email+password?
6. Employee floor auth: PIN login, badge scan, or something else — full email auth is
   likely too slow for a shared shop-floor tablet.
7. Inventory decrement timing: at order placement or at dispatch?
8. Molly's Ops Dashboard is confirmed as a role-gated view inside the same Next.js
   app as Master Connect (Section 3.1 settles this — resolved), served on its own
   subdomain rather than a separate deployment.
9. Phase 2 payment processor (Stripe assumed as default, not yet confirmed).
10. How current/trustworthy is the label-stock count in the existing spreadsheet? Is
    it accurate enough to hard-block fulfillment when a SKU shows zero labels, or
    should v1 treat it as an informational warning only? (Section 12)
11. **Resolved:** labelling is batched by product across all pending orders
    (line-item-level completion via `OrderTaskLineItem`); packing and dispatch stay
    whole-order completions. (Section 11) The remaining open point is whether the
    labelling queue should be an always-on "whatever's currently pending" pool, or a
    manually-curated batch Molly selects in advance — see the ASSUMPTION in Section 11.
12. Should new products default to visible in the wholesale portal on creation, or
    hidden until Molly explicitly flips them on? (Section 5.1.1)
13. Confirm the exact subdomain names (Section 3.1) — `portal` / `admin` / `dashboard`
    / `floor` are reasonable defaults, but should be locked in before they show up in
    outbound customer emails and staff bookmarks.
14. Should the platform log which `EmailTemplate` was sent to which `SalesLead` and
    when (Section 10.6), or stay a read-only reference library for v1? Affects schema
    (a join table vs. none).

---

**Instruction to Claude Code:** Build against this brief as the source of truth. Where
an "ASSUMPTION" is stated, implement it but note it in your PR description / README so
it can be corrected. Where "CONFIRM WITH USER" is stated, surface the question clearly
rather than silently guessing, since these choices affect the data model in ways that
are expensive to change later.
