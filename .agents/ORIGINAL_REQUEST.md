# Original User Request

## Initial Request — 2026-08-19T13:51:06Z

Add 7 Vyapar-inspired features to a production Medical Inventory & Pharmacy ERP (Next.js 14 + NestJS 10 + PostgreSQL on Neon Cloud), fix all known live website bugs, and deploy the fully working system to Vercel (frontend) and Render (backend).

Working directory: d:/antigravity programme/medical_inventory
Integrity mode: development

## Background Context

- **Live Frontend**: https://web-three-rho-95.vercel.app
- **Live Backend API**: https://medical-inventiroy.onrender.com
- **Database**: Neon PostgreSQL (already seeded, 38+ tables, super admin: admin@medcare.com / Admin@123456)
- **GitHub**: https://github.com/ck724280-gif/medical_inventiroy (branch: main)
- **Monorepo**: Turborepo — pps/web (Next.js 14 App Router), pps/api (NestJS 10), packages/shared-types, packages/constants, packages/validation, packages/shared-utils
- **Database URL**: postgresql://neondb_owner:npg_zprDj3gNco1W@ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require

---

## Phase 1 — Fix All Known Live Website Bugs

### R1. Fix Runtime Crashes on All Pages

Several pages crash at runtime because the paginated API response { data: [], meta: {} } is not unwrapped before .map() is called. This must be audited and fixed across **all** pages in pps/web/src/app/, not just suppliers and customers.

Pages to check and fix: /suppliers, /customers, /purchases, /sales, /medicines, /inventory, /expenses, /sales-returns, /reports, /pos, /import, /settings.

Pattern to fix everywhere:
`	s
// WRONG - crashes when API returns { data: [...], meta: {...} }
return res.data || [];

// CORRECT
return Array.isArray(res.data) ? res.data : (res.data?.data || []);
`

And in JSX .map() calls:
`	s
// WRONG
items?.map(...)

// CORRECT
(Array.isArray(items) ? items : []).map(...)
`

### R2. Fix Authentication & Session Issues

- Login page (/login) must authenticate successfully with dmin@medcare.com / Admin@123456 against the live Render backend.
- After login, the JWT access token must be stored (cookie or localStorage) and automatically sent as Authorization: Bearer <token> on all subsequent API requests.
- If the token is expired, user must be redirected to /login automatically.
- Currently the NEXT_PUBLIC_API_URL env variable points to https://medical-inventiroy.onrender.com. Confirm this is correctly wired in pps/web/src/lib/api-client.ts.

---

## Phase 2 — Add 7 Vyapar-Inspired Medical Features

### R3. Strip ? Tablet ? Loose Unit Conversion Engine

Add multi-level unit conversion for medicines:
- A medicine can have a **Primary Unit** (Box), **Secondary Unit** (Strip), and **Tertiary Unit** (Tablet/Capsule/ml).
- Define conversion ratios: 1 Box = N Strips, 1 Strip = M Tablets.
- The POS billing terminal and purchase entry must allow selling/purchasing in any unit level (e.g.  3 loose tablets out of a strip).
- Stock deduction must automatically convert and update the base unit quantity atomically.
- Schema: Add medicine_units table (or extend existing medicines) with unit_name, conversion_factor, parent_unit_id.

### R4. Party-Wise Special Pricing & Discount Matrix

- Allow defining a custom MRP / selling price / discount % per medicine per customer or supplier.
- When a customer is selected in POS or sales invoice, the system auto-fills their special price for that medicine if one exists.
- UI: Add a Special Prices section in the Customer detail page and Medicine detail page.
- Schema: Add party_item_price table with (party_id, medicine_id, custom_price, discount_percent, effective_from, effective_to).

### R5. GST Return Reports (GSTR-1, GSTR-3B & HSN Summary)

- Add a Reports page section with exportable GST reports:
  - **GSTR-1**: Month-wise B2B (with GSTIN) and B2C invoice summary.
  - **GSTR-3B**: Output tax vs input tax vs net GST payable summary table.
  - **HSN-wise Summary**: Quantity sold, taxable value, CGST, SGST, IGST grouped by HSN code and tax slab.
- Export format: Excel (.xlsx) using exceljs or xlsx library.
- Backend: Add /reports/gstr1, /reports/gstr3b, /reports/hsn-summary endpoints.

### R6. Barcode Label Printing (Thermal Label Printer)

- After any purchase inward entry is saved, offer a Print Barcode Labels button.
- The label template must include: Medicine Name, Batch No, Expiry Date, MRP, Barcode (Code-128 or EAN-13).
- The label must be formatted for 40mm×20mm thermal labels (standard medicine shelf label size).
- Use JsBarcode library to generate barcode SVGs rendered into printable HTML.
- The print action must open a browser print dialog pre-formatted for the label size.

### R7. Schedule H / H1 Drug Register (Legal Compliance)

- Mark medicines as Schedule H, Schedule H1, Schedule X, or OTC in the medicine master.
- When a Schedule H/H1 medicine is added to a sale invoice, force the user to enter:
  - Doctor's Name
  - Doctor's Registration Number
  - Patient's Name & Age
  - Prescription Reference Number
- Store this data linked to the sale invoice.
- Add a Schedule H Register report that lists all such sales in a date range, exportable as Excel, for drug inspector compliance.

### R8. WhatsApp Invoice Sharing & Payment Reminder

- After a sale invoice is saved, show a Share on WhatsApp button.
- The button must open https://wa.me/<customer_mobile>?text=<url_encoded_message> with a pre-formatted message containing:
  - Business Name, Invoice Number, Date, Total Amount, Payment Status.
  - A PDF download link if PDF generation is implemented (optional — can be plain text message if PDF is not implemented).
- Add a Send Payment Reminder button on the Customers page for customers with outstanding balance, which generates the same WhatsApp URL with a reminder message template.

### R9. Purchase Order (PO) ? Inward Bill Auto-Conversion

- Add a Purchase Orders section (/purchase-orders):
  - Create a PO with supplier, expected delivery date, and line items (medicine + qty + expected rate).
  - PO status: Draft ? Sent to Supplier ? Partially Received ? Fully Received.
- When goods arrive, open the PO and click Convert to Purchase Bill — this pre-fills a new purchase inward entry with all PO line items.
- The user can adjust quantities actually received before saving the purchase bill.
- Schema: Add purchase_orders and purchase_order_items tables.

---

## Phase 3 — Deploy & Make Live

### R10. Full GitHub Push & Auto-Deploy

- After all features are implemented and verified locally, commit all changes to the main branch of https://github.com/ck724280-gif/medical_inventiroy.
- The commit must include:
  - All new/modified frontend files in pps/web/
  - All new/modified backend files in pps/api/
  - Any new Prisma migrations in prisma/
  - Updated package.json files if new dependencies are added
- After push, Vercel auto-deploys the frontend. Render auto-deploys the backend.
- Run 
px prisma db push with the DATABASE_URL postgresql://neondb_owner:npg_zprDj3gNco1W@ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require to apply schema changes.

---

## Acceptance Criteria

### Phase 1 — Bug Fixes
- [ ] Navigating to /suppliers on the live Vercel URL does NOT show Application error: a client-side exception has occurred.
- [ ] Navigating to /customers on the live Vercel URL shows a working customer table.
- [ ] Login with dmin@medcare.com / Admin@123456 on the live site succeeds and redirects to dashboard.
- [ ] All pages (/medicines, /purchases, /sales, /inventory, /expenses) load without runtime crashes.

### Phase 2 — New Features
- [ ] A medicine can be configured with Box ? Strip ? Tablet conversion in the medicines form.
- [ ] POS billing terminal allows entering quantity in Tablets and stock deducts the correct fractional Box/Strip amount.
- [ ] Setting a special price for Customer X on Medicine Y causes that price to auto-load when Customer X is selected in a new sale.
- [ ] The Reports page has GSTR-1, GSTR-3B, and HSN Summary tabs, each downloadable as .xlsx.
- [ ] After saving a purchase bill, a Print Labels button generates a printable 40×20mm barcode label page.
- [ ] Adding a Schedule H medicine to a sale invoice triggers a prescription form; the Schedule H Register report lists the sale.
- [ ] The Share on WhatsApp button on a saved invoice opens the WhatsApp share URL with correct message.
- [ ] A Purchase Order can be created and converted to a Purchase Bill with one click.

### Phase 3 — Live Deployment
- [ ] git push origin main succeeds with all changes.
- [ ] Vercel build log shows ? Compiled successfully and ? Generating static pages.
- [ ] Render backend redeploys and GET https://medical-inventiroy.onrender.com/api/health returns 200.
- [ ] 
px prisma db push runs without errors against the Neon DB.
