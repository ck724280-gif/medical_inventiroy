# MASTER DEVELOPMENT PROMPT
## Advanced Medical Inventory & Pharmacy ERP/POS System
### Single Medical Business + Node.js + PostgreSQL + Web + Android

You are a **senior full-stack architect, Node.js/TypeScript engineer, PostgreSQL database architect, pharmacy/POS domain expert, Android engineer, cybersecurity engineer, DevOps engineer and UI/UX designer**.

Build a **production-ready, secure, scalable and professional Medical Inventory & Pharmacy ERP/POS system for ONE medical business/user account**.

This is **NOT a multi-tenant SaaS application**.

Do not implement:

- Multi-tenant architecture
- Tenant switching
- Platform administration
- Subscription management
- Tenant isolation
- Tenant onboarding
- SaaS plans
- Platform-level users

The application is designed for **one medical business**, but it must be highly configurable so that the owner can change the business identity and settings without modifying source code.

The same codebase should also be reusable for another medical business in the future by changing configuration and database deployment, not by adding customer-specific code.

---

# 1. CORE OBJECTIVE

Build a complete professional pharmacy/medical-store system covering:

- Medicine management
- Generic medicine management
- Categories
- Manufacturers
- Suppliers
- Customers
- Purchases
- Purchase invoices
- Batch-wise stock
- Expiry tracking
- FEFO
- Barcode scanning
- POS billing
- Thermal receipt printing
- A4 invoice
- PDF invoice
- Digital bill sharing
- Sales
- Sales returns
- Purchase returns
- Payments
- Expenses
- Stock adjustments
- Stock transfers
- Reports
- Dashboard
- User management
- Roles and permissions
- Audit logs
- Notifications
- Backup/restore
- Multi-branch readiness
- Android application
- APK
- AAB
- GitHub deployment workflow
- Vercel-compatible web frontend

---

# 2. MANDATORY TECHNOLOGY STACK

## Backend

Use:

- Node.js
- TypeScript
- NestJS
- REST API
- PostgreSQL
- Prisma ORM

## Web

Use:

- Next.js
- React
- TypeScript

## Android

Use:

- React Native
- Expo
- TypeScript

## Optional infrastructure

Use only where technically justified:

- Redis
- BullMQ
- WebSocket/Socket.IO

## Source Control

- GitHub

## Web Hosting

- Vercel-compatible

## Backend Hosting

- Independently deployable Node.js/NestJS application

## Database

- PostgreSQL

Do not use:

- PHP
- Laravel
- Django
- Flask
- Spring Boot
- ASP.NET
- Any non-Node backend

---

# 3. SINGLE-BUSINESS ARCHITECTURE

The system represents **one medical business**.

Use the following conceptual hierarchy:

```text
MEDICAL BUSINESS
│
├── Business Settings
├── Users
├── Roles
├── Branches
├── Medicines
├── Suppliers
├── Customers
├── Purchases
├── Inventory
├── Sales
├── Returns
├── Payments
├── Expenses
├── Reports
└── Audit Logs
```

There must be no tenant ID or multi-tenant context in the core business model unless it is only used as a future portability abstraction without creating actual multi-tenancy.

Do not implement unnecessary multi-tenant complexity.

---

# 4. BUSINESS PROFILE / WHITE-LABEL CONFIGURATION

Even though this is a single-business system, **all business identity information must be configurable**.

The owner must be able to change:

- Medical/store name
- Logo
- Favicon
- Address
- City
- State
- Country
- PIN/ZIP
- Phone number
- Alternate phone
- Email
- Website
- GST/tax information where applicable
- Pharmacy/license information where applicable
- Business description
- Currency
- Time zone
- Date format
- Time format
- Default language
- Business hours

Never hard-code the business identity into the application.

---

# 5. BUSINESS BRANDING

The business should be able to configure:

- Logo
- Favicon
- Primary brand color
- Secondary brand color
- Invoice logo
- Thermal receipt logo
- Dashboard branding
- Login-page branding where appropriate

The same system must automatically use the configured branding in:

- Web application
- Android application
- Thermal receipt
- A4 invoice
- PDF invoice
- Email invoice templates where applicable

Changing the logo or business name must NOT require changing source code.

---

# 6. USERS AND ROLES

Implement proper role-based access control.

Default roles:

### Owner / Super Admin

Full access.

### Admin

Business settings, users, inventory, purchases, sales and reports.

### Manager

Inventory, purchases, sales, reports and staff supervision.

### Pharmacist

Medicine, batches, POS, sales and prescription-related functionality as authorized.

### Cashier

POS, customers, payments and invoices.

### Inventory Staff

Purchase receiving, stock management and adjustments.

### Accountant

Payments, expenses and financial reports.

Permissions must be configurable.

Example:

```text
medicine.view
medicine.create
medicine.edit
medicine.delete

purchase.view
purchase.create
purchase.approve
purchase.return

sale.create
sale.cancel
sale.return

inventory.view
inventory.adjust
inventory.transfer

report.view
report.export

user.manage
role.manage
settings.manage
audit.view
```

Backend must enforce permissions.

---

# 7. AUTHENTICATION

Implement secure authentication.

Support:

- Email/password
- Mobile/password where required
- Secure password hashing using Argon2 or bcrypt
- Access tokens
- Secure refresh token/session architecture
- Logout
- Session expiration
- Login rate limiting
- Failed-login protection
- Password reset
- Change password
- Optional MFA-ready design

Never store plain-text passwords.

---

# 8. MEDICINE MASTER

Create a comprehensive Medicine Master.

Fields:

- Medicine ID
- Medicine name
- Generic name
- Brand name
- Composition
- Strength
- Dosage form
- Category
- Sub-category
- Manufacturer
- SKU
- Barcode
- EAN/UPC/GTIN where applicable
- HSN where applicable
- Tax/GST configuration
- Base unit
- Pack size
- Box quantity
- Strip quantity
- Tablet/capsule quantity
- MRP
- Default purchase price
- Default selling price
- Reorder level
- Reorder quantity
- Maximum stock
- Prescription-required flag
- Active/inactive status
- Notes

Support:

- Tablet
- Capsule
- Syrup
- Injection
- Cream
- Ointment
- Drops
- Powder
- Inhaler
- Suspension
- Other configurable forms

---

# 9. MULTI-UNIT INVENTORY

Support configurable unit conversions.

Example:

```text
1 Box = 10 Strips
1 Strip = 10 Tablets
```

Or:

```text
1 Carton = 20 Bottles
```

Maintain a base unit for stock calculations.

Prevent invalid quantities according to configured conversion rules.

---

# 10. BATCH-WISE INVENTORY

Inventory must be batch-aware.

Do not store only:

```text
medicine_id + quantity
```

Every batch must have:

- Medicine
- Branch/location
- Batch number
- Manufacturing date
- Expiry date
- Supplier
- Purchase invoice
- Purchase price
- MRP
- Selling price
- Tax
- Initial quantity
- Current quantity
- Reserved quantity where needed
- Damaged quantity
- Expired quantity
- Batch status

Example:

```text
Paracetamol 500mg

Batch A
100 units
Expiry: Dec 2027

Batch B
200 units
Expiry: Jun 2028
```

Both batches must remain separately traceable.

---

# 11. FEFO

Implement:

**First Expiry, First Out**

During sale:

1. Find all valid batches
2. Exclude expired batches
3. Exclude blocked/recalled/quarantined batches
4. Sort by earliest expiry
5. Consume earliest valid batch first
6. Continue with next valid batch when necessary

The actual batch used in each sale must be recorded.

---

# 12. PURCHASE MANAGEMENT

Purchase workflow:

```text
Supplier
↓
Purchase Invoice
↓
Medicine
↓
Batch
↓
Quantity
↓
Purchase Price
↓
MRP
↓
Expiry
↓
Tax
↓
Discount
↓
Confirmation
↓
Stock Increase
```

Support:

- Draft purchase
- Purchase confirmation
- Purchase approval
- Purchase invoice
- Purchase return
- Partial purchase return
- Supplier payment
- Outstanding supplier balance
- Purchase history
- Purchase PDF
- Purchase print

Do not increase stock before the purchase is properly posted/confirmed.

---

# 13. STOCK RECEIVING

Provide a dedicated stock receiving workflow.

Support:

- Manual entry
- Barcode-assisted receiving
- Batch entry
- Expiry validation
- Quantity verification
- Duplicate batch warning
- Price mismatch warning
- Short receiving
- Excess receiving
- Damaged receiving

Show a final confirmation before posting stock.

---

# 14. BARCODE SYSTEM

Support:

- USB barcode scanner
- Keyboard-emulation scanner
- Camera barcode scanner
- Manual barcode entry
- EAN
- UPC
- GTIN
- Applicable 2D barcodes
- Internal barcode generation

Workflow:

```text
SCAN
↓
IDENTIFY PRODUCT
↓
FIND VALID BATCHES
↓
VALIDATE
↓
APPLY FEFO
↓
ADD TO CART
```

Do not assume every retail barcode contains:

- Batch
- Expiry
- MRP

If an applicable 2D barcode contains additional information, parse and validate it.

---

# 15. ADVANCED POS

Create a fast medical-store POS optimized for billing counters.

The POS must provide:

- Barcode scanning
- Medicine search
- Customer search
- Add customer
- Cart
- Batch
- Expiry
- Quantity
- Rate
- Discount
- Tax
- Total

Support:

- Rapid barcode scanning
- Manual medicine search
- Multiple medicines
- Quantity editing
- Delete item
- Clear cart
- Hold bill
- Resume held bill
- Authorized price override
- Line discount
- Invoice discount
- Tax
- Cash
- UPI
- Card
- Bank transfer
- Credit
- Other configurable payment modes
- Split payment where required

---

# 16. THERMAL BILLING — DEFAULT

The default medical-store bill must be a **small-width, long thermal receipt**, not an A4 page.

Support:

- 58mm
- 80mm

The owner must be able to select the default paper width.

---

# 17. THERMAL RECEIPT DESIGN

Receipt must be optimized for narrow paper.

Example structure:

```text
        ABC MEDICAL STORE
       Address / Phone
--------------------------------
Invoice: INV-000125
Date: 19-08-2026 10:45 PM
Customer: Rahul
Mobile: 98XXXXXXXX
--------------------------------
Item          Qty Rate   Amount
--------------------------------
Paracetamol    2  2.00    4.00
Cetirizine     1  3.00    3.00
Syrup          1 80.00   80.00
--------------------------------
Subtotal               87.00
Discount                2.00
Tax                     X.XX
--------------------------------
TOTAL                  XX.XX
--------------------------------
Payment: UPI

          Thank You!
        Get Well Soon
```

The final design can be improved visually, but must remain readable on thermal paper.

---

# 18. THERMAL RECEIPT CUSTOMIZATION

Allow the owner to configure:

- Store logo
- Store name
- Address
- Phone
- Email
- GST/tax details
- License information where applicable
- Invoice prefix
- Footer
- Return policy
- Thank-you message
- Displayed fields
- Paper width
- Printer configuration

Changing any of these settings must automatically affect future receipts.

---

# 19. THERMAL PRINTER SUPPORT

Support:

- 58mm thermal printers
- 80mm thermal printers
- ESC/POS-compatible printers where supported
- USB printers
- Bluetooth printers
- Network printers

Provide:

- Printer selection
- Test print
- Paper width
- Auto-cut where supported
- Reprint
- Printer configuration
- Print preview where technically possible

Do not hard-code one printer brand.

---

# 20. THREE BILL FORMATS

The same sale must support:

### 1. Thermal Receipt

- 58mm
- 80mm

### 2. A4 Invoice

Detailed professional invoice.

### 3. PDF Invoice

Digital version of the invoice.

All formats must use the same underlying invoice data and calculations.

Do not maintain separate billing calculations for each output format.

---

# 21. BILLING COMPLETION WORKFLOW

After successful sale:

```text
Confirm Sale
↓
Validate Stock
↓
Validate Permissions
↓
Calculate Price
↓
Calculate Discount
↓
Calculate Tax
↓
Create Invoice
↓
Record Payment
↓
Deduct Stock
↓
Create Stock Movement
↓
Create Audit Log
↓
Generate Thermal/PDF Data
↓
Show:
    Print Thermal
    Print A4
    Download PDF
    Share PDF
    Reprint
```

All critical financial and inventory updates must happen inside a database transaction.

---

# 22. DIGITAL BILL DELIVERY

After generating the invoice support:

- Download PDF
- Share PDF
- Email
- SMS provider
- WhatsApp Business/API integration

The customer mobile number can be stored against the invoice/customer record.

A mobile number alone must NOT be treated as sufficient to automatically send a PDF through WhatsApp.

Only authorized APIs/providers should be used.

---

# 23. CUSTOMER MANAGEMENT

Customer fields:

- Customer ID
- Name
- Mobile number
- Email
- Address
- Optional DOB
- Notes
- Purchase history
- Invoice history

Search by:

- Name
- Mobile
- Invoice number

Do not collect unnecessary personal information.

---

# 24. SALES RETURN

Support:

- Full return
- Partial return
- Item-level return
- Quantity-based return
- Original invoice lookup
- Batch verification
- Refund
- Store credit where configured

Returned medicine must not automatically become saleable stock.

Evaluate whether it is:

- Resalable
- Quarantined
- Damaged
- Expired

---

# 25. PURCHASE RETURN

Support:

- Full purchase return
- Partial purchase return
- Batch-level return
- Supplier credit
- Supplier refund
- Stock deduction
- Return history

Reference the original purchase.

---

# 26. EXPIRY MANAGEMENT

Create a dedicated expiry dashboard.

Categories:

- Expired
- Expiring in 7 days
- 30 days
- 60 days
- 90 days
- Custom

Show:

- Medicine
- Batch
- Expiry
- Quantity
- Supplier
- Purchase cost
- Estimated value

Features:

- Expiry alerts
- Expired blocking
- Batch filtering
- Disposal/adjustment workflow
- Audit history

Expired medicines must not be sold through normal POS.

---

# 27. LOW STOCK / REORDER

Each medicine can define:

- Minimum stock
- Reorder level
- Reorder quantity
- Maximum stock

Display:

- Low stock
- Critical stock
- Out of stock

Provide reorder suggestions based on:

- Current stock
- Average sales
- Reorder level
- Lead time
- Historical demand

Keep forecasting modular.

---

# 28. STOCK MOVEMENT LEDGER

Every stock movement must create a record.

Types:

```text
OPENING_STOCK
PURCHASE
SALE
SALES_RETURN
PURCHASE_RETURN
TRANSFER_IN
TRANSFER_OUT
ADJUSTMENT
DAMAGE
EXPIRY
OTHER
```

Record:

- Branch
- Medicine
- Batch
- Quantity
- Unit
- Direction
- Reference
- User
- Timestamp
- Reason

Never silently overwrite stock.

---

# 29. STOCK ADJUSTMENT

Provide authorized stock adjustment.

Require:

- Medicine
- Batch
- Existing quantity
- Adjustment quantity
- New quantity
- Reason
- User
- Timestamp

Support optional approval for important adjustments.

Examples:

- Physical mismatch
- Damage
- Expiry
- Loss
- Correction

---

# 30. MULTI-BRANCH READY

Although this is a single-business system, the architecture should support multiple branches belonging to the same business.

Example:

```text
ABC Medical
│
├── Main Branch
├── Branch 2
└── Branch 3
```

Each branch can have:

- Address
- Phone
- Business hours
- Users
- Inventory
- Sales
- Purchases
- Printer
- Invoice settings

Users may be restricted to specific branches.

A stock transfer must only occur between branches belonging to this same business.

---

# 31. SUPPLIER MANAGEMENT

Supplier fields:

- Name
- Company
- Contact person
- Phone
- Email
- Address
- Tax information where applicable
- Payment terms
- Credit limit
- Opening balance
- Status

Reports:

- Purchase history
- Outstanding balance
- Payment history
- Returns

---

# 32. EXPENSE MANAGEMENT

Track:

- Rent
- Electricity
- Salary
- Transport
- Internet
- Maintenance
- Miscellaneous

Fields:

- Category
- Amount
- Date
- Payment method
- Notes
- Attachment if needed

---

# 33. FINANCIAL MODULE

Provide:

- Sales
- Purchases
- Expenses
- Gross profit
- Net profit estimate
- Supplier payable
- Customer receivable where applicable
- Tax summary
- Payment summary

Calculate profit using actual relevant purchase/batch cost where appropriate.

---

# 34. REPORTS

Create:

## Sales Reports

- Daily
- Weekly
- Monthly
- Custom date range
- Medicine-wise
- Category-wise
- User-wise
- Branch-wise
- Customer-wise
- Payment-wise

## Purchase Reports

- Supplier-wise
- Medicine-wise
- Branch-wise
- Date range

## Inventory Reports

- Current stock
- Batch stock
- Stock valuation
- Low stock
- Out of stock
- Expired
- Expiring
- Damaged
- Stock movement

## Business Reports

- Revenue
- Cost
- Gross profit
- Expenses
- Net profit estimate

Export:

- PDF
- CSV
- Excel-compatible format

Large reports should use server-side/background generation.

---

# 35. DASHBOARD

Display:

- Today's sales
- Today's purchases
- Current stock value
- Estimated gross profit
- Low stock
- Out of stock
- Expiring stock
- Expired stock
- Pending supplier payments

Charts:

- Sales trend
- Purchase trend
- Top medicines
- Category sales
- Payment modes
- Branch performance

Provide filters:

- Today
- Week
- Month
- Custom range
- Branch

---

# 36. AUDIT LOG

Track sensitive actions:

- Login
- Logout
- Failed login
- Medicine creation
- Medicine update
- Price change
- Batch update
- Purchase posting
- Sale
- Sale cancellation
- Sales return
- Purchase return
- Stock adjustment
- User creation
- Permission change
- Settings change
- Invoice operations

Record:

- User
- Action
- Entity
- Entity ID
- Timestamp
- Old value where safe
- New value where safe
- IP/device metadata when appropriate

Never log:

- Passwords
- Access tokens
- Refresh tokens
- API secrets

---

# 37. SECURITY

Implement production-grade application security.

## Authentication

- Secure password hashing
- Session/token security
- Rate limiting
- Failed-login protection
- Session expiry
- Secure logout

## Authorization

- Backend permission enforcement
- Role-based access control
- Branch-level access where required

## API

- DTO validation
- SQL injection protection
- XSS protection
- CSRF protection where applicable
- CORS configuration
- Secure headers
- Request size limits
- Secure error handling
- Rate limiting

## File uploads

- MIME validation
- Extension validation
- File size limits
- Secure storage
- Path traversal protection

Never rely only on frontend security.

---

# 38. DATABASE DESIGN

Use normalized PostgreSQL schema.

At minimum support entities for:

```text
users
roles
permissions
user_roles
branch_memberships

business_settings
business_branding
branch_settings

medicines
medicine_categories
manufacturers
units
medicine_units
barcodes

suppliers
customers

batches
inventory
stock_movements

purchase_invoices
purchase_items
purchase_payments
purchase_returns
purchase_return_items

sales_invoices
sales_items
sales_payments
sales_returns
sales_return_items

expenses

stock_transfers
stock_transfer_items

notifications
audit_logs
files
message_logs

printer_settings
invoice_templates
receipt_templates
```

Use:

- Primary keys
- Foreign keys
- Unique constraints
- Composite indexes where useful
- Check constraints
- Proper timestamps
- Referential integrity

---

# 39. DATA INTEGRITY

Critical business rules must be enforced at both application and database level where possible.

Examples:

- Cannot sell more than available stock
- Cannot sell expired batch
- Cannot duplicate invoice number
- Cannot create invalid batch
- Cannot record payment for nonexistent invoice
- Cannot return more than sold quantity
- Cannot return more than purchased quantity
- Cannot create impossible unit conversion
- Cannot create negative stock unintentionally

---

# 40. TRANSACTIONS AND CONCURRENCY

Use database transactions for:

- Sales
- Purchase posting
- Sales returns
- Purchase returns
- Stock adjustments
- Stock transfers
- Payment posting
- Invoice creation

Prevent race conditions when two cashiers sell the same stock simultaneously.

No double-selling or inconsistent stock should occur.

---

# 41. SEARCH

Provide fast search by:

- Medicine name
- Generic name
- Brand
- Barcode
- SKU
- Batch number
- Supplier
- Customer mobile
- Invoice number

Use database indexes.

Avoid loading thousands of records unnecessarily.

---

# 42. OPENING STOCK

Create an opening-stock wizard.

Support CSV/Excel import with:

- Medicine
- Batch
- Expiry
- Quantity
- Purchase price
- MRP

Validate all records before committing.

Show row-level errors.

---

# 43. IMPORT / EXPORT

Import:

- Medicines
- Opening stock
- Suppliers
- Customers

Export:

- Medicines
- Inventory
- Sales
- Purchases
- Customers
- Suppliers
- Reports

Validate all imported data before insertion.

---

# 44. BACKUP AND RESTORE

Provide:

- Database backup
- Backup history
- Verification
- Restore procedure
- Scheduled backup support where hosting allows

Never expose database backups publicly.

---

# 45. NOTIFICATIONS

Support:

- Low-stock notification
- Critical-stock notification
- Expiry notification
- Expired-stock notification
- Pending supplier payment
- Pending approvals
- Important stock adjustment notifications
- Backup failure notification

Use in-app notifications and optional email/SMS/WhatsApp integrations.

---

# 46. WEB APPLICATION

Build a professional Next.js application with:

- Login
- Dashboard
- Medicines
- Inventory
- Batches
- Purchases
- POS
- Sales
- Returns
- Customers
- Suppliers
- Expenses
- Reports
- Users
- Roles
- Notifications
- Audit
- Settings
- Printer settings
- Invoice settings
- Business branding

POS must be:

- Desktop-first
- Fast
- Keyboard-friendly
- Scanner-friendly
- Low-click

---

# 47. ANDROID APPLICATION

Build a real Android application using:

**React Native + Expo + TypeScript**

Support:

- Login
- Dashboard
- Medicine search
- Camera barcode scanning
- Stock lookup
- Batch information
- Expiry
- POS
- Customer selection
- Invoice history
- PDF viewing
- PDF sharing
- Sales
- Purchases according to permissions
- Low stock
- Expiry alerts
- Reports
- Notifications
- Business branding
- Printer support where technically feasible

The Android app must communicate with the same Node.js API.

---

# 48. ANDROID BRANDING

The Android application must load business information dynamically from the backend:

- Store name
- Logo
- Contact information
- Invoice branding

Do not require source-code modification merely to change the business name or logo.

---

# 49. ANDROID BARCODE SCANNING

Flow:

```text
Open Scanner
↓
Camera Permission
↓
Scan Barcode
↓
Identify Medicine
↓
Find Valid Batch
↓
Apply FEFO
↓
Add to Cart
```

For an unknown barcode:

- Show clear error
- Allow manual search
- Allow authorized barcode assignment

---

# 50. ANDROID POS

Support:

- Barcode scan
- Manual search
- Quantity
- Batch
- Expiry
- Discount where authorized
- Payment
- Invoice
- PDF
- Share
- Reprint where technically supported

All calculations must be validated by the backend.

---

# 51. MOBILE THERMAL PRINTING

Where technically supported, provide:

- Bluetooth thermal printer
- Network printer
- USB printer

Support:

- 58mm
- 80mm

Allow:

- Printer setup
- Test print
- Print bill
- Reprint

Do not hard-code one printer vendor.

---

# 52. OFFLINE-AWARE MOBILE DESIGN

Allow offline caching of non-critical information.

Do not allow unsafe offline inventory mutations.

Critical transactions must remain server-authoritative.

Use:

- Idempotency
- Safe retry
- Duplicate submission prevention
- Clear connectivity state

---

# 53. GITHUB STRUCTURE

Use a clean monorepo:

```text
medical-inventory/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── constants/
│   └── shared-utils/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docs/
├── .env.example
├── package.json
└── README.md
```

The exact structure may be improved if technically justified.

---

# 54. VERCEL DEPLOYMENT

The web frontend must be deployable through GitHub → Vercel.

Recommended architecture:

```text
GitHub
   │
   ├── Next.js Web
   │       ↓
   │     Vercel
   │
   ├── NestJS API
   │       ↓
   │  Node.js Hosting
   │
   └── PostgreSQL
```

The backend must remain independently deployable.

Do not tightly couple business logic to Vercel.

---

# 55. ENVIRONMENT VARIABLES

Use `.env` locally and Vercel/server environment variables in production.

Examples:

```text
DATABASE_URL
JWT_SECRET
REFRESH_TOKEN_SECRET
API_URL
NEXT_PUBLIC_API_URL
REDIS_URL
STORAGE_URL
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
WHATSAPP_API_KEY
SMS_API_KEY
```

Only expose variables that are intentionally public.

Never put secrets in GitHub.

---

# 56. APK AND AAB

Configure React Native/Expo build system for:

### APK

For testing/direct installation.

### AAB

For Google Play Store.

Securely manage Android signing.

Never commit:

- Keystore
- Signing passwords
- Private keys

---

# 57. PERFORMANCE

Design for large inventories and high transaction counts.

Use:

- Pagination
- Server-side filtering
- Server-side sorting
- Database indexes
- Efficient queries
- Avoid N+1 queries
- Lazy loading
- Background jobs
- Report optimization
- Connection pooling

Do not load the complete medicine/inventory table into the browser.

---

# 58. ERROR HANDLING

Never show raw technical errors to normal users.

Bad:

```text
SQLSTATE[23505]...
```

Good:

```text
This invoice number already exists.
```

Technical details must be logged securely.

---

# 59. TESTING

Create automated tests for:

## Inventory

- Purchase increases stock
- Sale decreases stock
- Return restores valid stock
- FEFO selection
- Expired stock blocked
- Negative stock prevented
- Concurrent sales protected

## Billing

- Correct invoice totals
- Discount
- Tax
- Payment
- Unique invoice numbers

## Returns

- Cannot return more than sold
- Correct batch restoration

## Security

- Unauthorized API blocked
- Permission checks
- Invalid token rejected
- Rate limiting
- Input validation

## Printing

- 58mm thermal receipt
- 80mm thermal receipt
- A4 invoice
- PDF invoice
- Reprint consistency

## Mobile

- Barcode scanning
- POS
- PDF
- Printing
- Authentication

---

# 60. CODE QUALITY

Use:

- TypeScript strict mode
- Modular architecture
- Reusable components
- Dependency injection
- DTO validation
- Services
- Central error handling
- Logging
- Tests

Avoid:

- Giant files
- Duplicate logic
- Hardcoded branding
- Hardcoded business values
- Hardcoded invoice numbers
- Frontend-only business logic
- Frontend-only security

---

# 61. NO CUSTOMER-SPECIFIC CODE

The application must remain reusable.

Do not create:

```text
customerA-code
customerB-code
customerC-code
```

Instead create one configurable application:

```text
ONE APPLICATION
+
BUSINESS SETTINGS
+
BUSINESS BRANDING
+
BUSINESS CONFIGURATION
```

A new medical business should be able to use the same codebase by configuring its own business information and deploying it with its own database/environment.

---

# 62. NO HARDCODED BUSINESS INFORMATION

Never hard-code:

- Medical name
- Logo
- Address
- Phone
- Email
- GST information
- License information
- Invoice prefix
- Thermal footer
- Printer
- Currency
- Tax configuration

All must come from configuration/database.

---

# 63. NO FAKE FUNCTIONALITY

Never create:

- Fake stock
- Fake payment
- Fake invoices
- Fake reports
- Hardcoded sales
- Static dashboard statistics
- Fake success responses
- Frontend-only inventory

All important functionality must use real PostgreSQL + Node.js backend logic.

---

# 64. BUSINESS SETTINGS PANEL

Create a comprehensive Settings section.

## Business Profile

- Medical/store name
- Logo
- Favicon
- Address
- Phone
- Email
- Website
- Business hours

## Tax & License

- GST/tax details
- Pharmacy/license information
- Other relevant business fields

## Billing

- Invoice prefix
- Invoice numbering
- Discount rules
- Tax display

## Thermal Receipt

- 58mm / 80mm
- Header
- Footer
- Logo
- Printer
- Display fields

## A4 Invoice

- Logo
- Layout
- Fields
- Footer

## Notifications

- Email
- SMS
- WhatsApp
- Expiry alerts
- Low-stock alerts

## Users & Roles

- Users
- Roles
- Permissions

## Branches

- Add/edit branches
- Printer
- Address
- Business hours

---

# 65. INVOICE SYSTEM

Support:

- Unique invoice numbering
- Invoice prefix
- Branch-specific numbering if configured
- Reprint
- Cancellation
- Return reference

Example:

```text
ABC-INV-000125
```

Invoice number generation must be transaction-safe.

---

# 66. INVOICE HISTORY

Every invoice must provide:

- View
- Thermal reprint
- A4 print
- Download PDF
- Share PDF
- Return
- Payment details
- Customer details
- Batch details

Search by:

- Invoice number
- Customer mobile
- Date
- User
- Medicine

---

# 67. STORE-SPECIFIC PRINTING

The configured business identity must automatically appear on every print.

Thermal:

```text
[LOGO]
[MEDICAL NAME]
[ADDRESS]
[PHONE]
```

A4:

```text
[LOGO]
[MEDICAL NAME]
[ADDRESS]
[CONTACT]
[TAX/LICENSE DETAILS]
```

PDF must use the same configuration.

---

# 68. FINAL BUSINESS FLOW

The complete workflow must be:

```text
BUSINESS SETUP
   ↓
BUSINESS BRANDING
   ↓
USERS / ROLES
   ↓
MEDICINE MASTER
   ↓
SUPPLIER
   ↓
PURCHASE
   ↓
BATCH
   ↓
INVENTORY
   ↓
BARCODE
   ↓
FEFO
   ↓
POS
   ↓
SALE
   ↓
PAYMENT
   ↓
INVOICE
   ↓
THERMAL / A4 / PDF
   ↓
PRINT / DOWNLOAD / SHARE
   ↓
STOCK DEDUCTION
   ↓
STOCK MOVEMENT
   ↓
AUDIT LOG
   ↓
REPORTS
```

---

# 69. IMPLEMENTATION PRIORITY

Implement in this order:

1. Project architecture
2. PostgreSQL schema
3. Prisma setup
4. Authentication
5. RBAC
6. Business settings
7. Business branding
8. Users
9. Branches
10. Medicine master
11. Categories/manufacturers/units
12. Suppliers
13. Customers
14. Batches
15. Inventory
16. Stock movement ledger
17. Purchases
18. Stock receiving
19. Barcode
20. FEFO
21. POS
22. Sales
23. Payments
24. Thermal receipt
25. 58mm/80mm printer support
26. A4 invoice
27. PDF
28. Digital sharing
29. Sales returns
30. Purchase returns
31. Expiry management
32. Low-stock/reorder
33. Expenses
34. Reports
35. Notifications
36. Audit logs
37. Multi-branch
38. Android app
39. Camera barcode scanning
40. Mobile billing
41. Mobile PDF/sharing
42. Mobile printing
43. APK
44. AAB
45. Testing
46. Security hardening
47. GitHub setup
48. Vercel deployment
49. Backend deployment
50. Documentation

---

# 70. FINAL PRODUCT DEFINITION

The final product must be a:

**Professional Single-Business Medical Inventory + Pharmacy ERP + POS System**

with:

- Configurable medical/store identity
- Configurable logo
- Configurable address
- Configurable phone
- Configurable email
- Configurable tax/license information
- Configurable invoice design
- Configurable thermal receipt
- 58mm and 80mm printing
- A4 invoices
- PDF invoices
- Digital bill sharing
- Barcode scanning
- Batch management
- FEFO
- Expiry control
- Low-stock management
- Purchase management
- Sales management
- Sales returns
- Purchase returns
- Supplier management
- Customer management
- Payments
- Expenses
- Reports
- Audit logs
- User roles
- Multi-branch readiness
- Web application
- Android application
- APK
- AAB
- GitHub integration
- Vercel-ready frontend
- Independently deployable Node.js backend
- PostgreSQL database

The system must be **configurable rather than hard-coded**, so that the owner can change the medical business's identity, branding, billing details, printer settings and operational configuration without modifying source code.

The architecture should be professional enough that the same codebase can later be deployed for another medical business by creating a separate production environment/database and changing configuration, without introducing customer-specific code.

The default pharmacy POS output must always prioritize the real-world **58mm/80mm thermal receipt**, while maintaining **A4 and PDF invoice support** from the same transaction.

Build this as a **secure, scalable, maintainable, production-grade Medical Inventory & Pharmacy ERP/POS application using Node.js/NestJS, PostgreSQL/Prisma, Next.js/React and React Native/Expo**.