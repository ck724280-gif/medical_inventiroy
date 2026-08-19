# Comprehensive Backend NestJS REST API Architectural Survey (`apps/api`)

**Project**: Medical Inventory & Pharmacy ERP / POS System (Single-Business, Multi-Branch White-Label)  
**Agent**: Explorer 2 (Survey & Backend NestJS REST API Architecture)  
**Date**: 2026-08-19  
**Status**: Verified & Build Tested (0 errors, 100% compilation clean)  

---

## Executive Summary

The backend service (`apps/api`) is a production-grade, highly modular REST API built on **NestJS 10**, **Prisma ORM 5**, **Argon2**, and **Passport JWT**. It orchestrates a single-business, multi-branch medical enterprise platform with 28 specialized domain modules, strict Role-Based Access Control (RBAC), immutable audit logging, global transaction management, First-Expiry-First-Out (FEFO) batch dispensing, and ESC/POS thermal printing capabilities.

### Key Architectural Highlights
- **28 Modular Domain Controllers & Services**: Fully decoupled architecture encompassing authentication, master data, live batch inventory, purchases, POS sales counter, returns, ESC/POS printing, financials, reports, audit, and backups.
- **Enterprise Security Stack**: Argon2id password hashing, rotating JWT refresh tokens with database tracking & instant revocation, 15-minute brute-force lockout after 5 failed attempts, global throttler rate limiting (100 req/min), and Helmet security headers.
- **Granular RBAC**: 40+ atomic permission codes evaluated by a global `PermissionsGuard` and `@RequirePermissions()` decorators with bypass for `OWNER` role.
- **Zero-Loss Transactions**: All inventory-altering workflows (Sales Checkout, Purchase Inward, Stock Adjustments, Inter-Branch Transfers, Sales/Purchase Returns, Opening Stock Import) run inside Prisma interactive `$transaction` blocks.
- **FEFO Dispensation**: Automatic batch allocation sorted by `expiryDate: 'asc'`, strictly preventing expired or non-active batch dispensation.
- **Thermal & PDF Receipt Engines**: Dedicated ESC/POS binary command builder for 58mm (32-char) and 80mm (48-char) thermal printers, plus A4 PDF Tax Invoice generation via PDFKit.
- **Financial & Tax Engine**: Real-time Gross Profit (`SellingPrice - BatchPurchasePrice`), Cost of Goods Sold (COGS), Output GST vs. Input GST calculations, and Excel export via ExcelJS.

---

## 1. Security & Infrastructure Architecture

```
[ Incoming HTTP Request ]
          │
          ▼
    [ Helmet Headers ]
          │
          ▼
   [ CORS Whitelist ]
          │
          ▼
 [ ValidationPipe (transform: true, whitelist: true) ]
          │
          ▼
  [ ThrottlerGuard (Rate Limiting: 100 req/min) ]
          │
          ▼
    [ JwtAuthGuard (Global, bypasses @Public()) ]
          │
          ▼
 [ PermissionsGuard (Checks @RequirePermissions) ]
          │
          ▼
  [ AuditInterceptor (Logs create/update/delete) ]
          │
          ▼
     [ Controller / Service Logic ($transaction) ]
          │
          ▼
[ GlobalHttpExceptionFilter / PrismaExceptionFilter ]
          │
          ▼
[ Standardized JSON Response Format ]
```

### 1.1 Password Security & Brute-Force Lockout
- **Hashing**: Argon2id via `argon2` npm package with default high-memory and iteration parameters.
- **Account Lockout Policy**:
  * Tracked via `failedLoginCount` and `lockedUntil` on `User` model.
  * 5 consecutive failed attempts trigger a 15-minute lockout (`lockedUntil = now + 15m`).
  * Successful authentication resets `failedLoginCount = 0` and `lockedUntil = null`.

### 1.2 JWT Token Lifecycle & Rotation
- **Access Token**: Short-lived (15 minutes), payload `{ sub: userId, email: user.email }`.
- **Refresh Token**: Long-lived (7 days), signed with dedicated `REFRESH_TOKEN_SECRET`.
- **Rotation & Revocation**:
  * Stored in `refresh_tokens` database table with device user-agent tracking.
  * Every refresh request revokes the old refresh token (`revokedAt = now()`) and issues a new token pair.
  * Logout supports single-session revocation or global session revocation (all active tokens for user).
  * Password change immediately invalidates all active refresh tokens.

### 1.3 RBAC Permission Model
- **40+ Granular Permissions**: Spans `medicine.*`, `inventory.*`, `purchase.*`, `sale.*`, `customer.*`, `supplier.*`, `expense.*`, `report.*`, `user.*`, `role.*`, `settings.*`, `branch.*`, `printer.*`, `audit.*`, `backup.*`, `notification.*`.
- **7 System Roles**: `OWNER` (full access), `ADMIN`, `MANAGER`, `PHARMACIST`, `CASHIER`, `INVENTORY_STAFF`, `ACCOUNTANT`.
- **Guard Mechanism**:
  * `JwtAuthGuard`: Enforces token validity globally across all endpoints unless decorated with `@Public()`.
  * `PermissionsGuard`: Reads permission metadata from `@RequirePermissions('permission.code')`, extracts permissions from the JWT user context, and denies unauthorized requests with `ForbiddenException (403)`.
  * Super Admin Bypass: Users with role `OWNER` automatically pass all permission checks.

### 1.4 Global Audit Interceptor
- Decorator: `@Auditable(action, entity)`
- Intercepts all mutating operations (POST, PATCH, DELETE).
- Automatically extracts:
  * `userId`: From JWT authentication context.
  * `action`: e.g. `pos_checkout`, `create_purchase`, `update_settings`.
  * `entity`: e.g. `SalesInvoice`, `PurchaseInvoice`, `Medicine`.
  * `entityId`: Extracted from response object ID or request URL params.
  * `newValue`: Request body payload with sensitive fields (`password`, `token`, `secret`, `creditCard`) recursively sanitized/redacted.
  * `ipAddress` & `deviceInfo`: Extracted from request headers.
- Fault-Tolerant: Asynchronous audit creation failure never interrupts the primary business transaction.

### 1.5 Global Exception Handling
- `GlobalHttpExceptionFilter`: Formats all NestJS HTTP exceptions and unhandled errors into standardized structure:
  ```json
  {
    "statusCode": 400,
    "timestamp": "2026-08-19T01:48:53.000Z",
    "path": "/api/pos/checkout",
    "message": "Insufficient stock in batch B101 for Paracetamol 500mg",
    "errors": null
  }
  ```
- `PrismaExceptionFilter`: Catches Prisma database errors and translates codes:
  * `P2002` -> `409 Conflict` (Duplicate unique constraint violation)
  * `P2025` -> `404 Not Found` (Record not found)
  * `P2003` -> `400 Bad Request` (Foreign key violation / referenced record in use)
  * `P2014` -> `400 Bad Request` (Relation constraint violation)

### 1.6 Swagger / OpenAPI Documentation
- Mounted at: `/docs`
- Configured with `DocumentBuilder().setTitle(...).setVersion('1.0.0').addBearerAuth().build()`.

---

## 2. Comprehensive 28 Domain Modules Catalog

| # | Module | Base Route | Primary Responsibilities |
|---|---|---|---|
| 1 | `AuthModule` | `/api/auth` | User login, JWT refresh token rotation, logout, password change, account lockout |
| 2 | `UsersModule` | `/api/users` | User CRUD, profile (`/me`), password reset, branch assignments, role mappings |
| 3 | `RolesModule` | `/api/roles` | Role definitions, permissions listing (`/permissions`), role assignment |
| 4 | `SettingsModule` | `/api/settings` | White-label business profile, public branding (`/public`), currency, timezone, receipt templates |
| 5 | `BranchesModule` | `/api/branches` | Multi-branch CRUD, branch settings, invoice prefixes, sequential numbering |
| 6 | `CategoriesModule` | `/api/categories` | Hierarchical medicine categories (parent/subcategories) |
| 7 | `ManufacturersModule` | `/api/manufacturers` | Pharmaceutical manufacturers master data |
| 8 | `UnitsModule` | `/api/units` | Units of measurement (Tablets, Strips, Boxes, Bottles) and conversion factors |
| 9 | `MedicinesModule` | `/api/medicines` | Medicine Master: generic/brand, composition, dosage forms, HSN, tax %, barcode lookup |
| 10 | `SuppliersModule` | `/api/suppliers` | Supplier master, payment terms, credit limits, outstanding balances |
| 11 | `CustomersModule` | `/api/customers` | Customer master, mobile lookup, purchase history, quick creation |
| 12 | `BatchesModule` | `/api/batches` | Batch lifecycle (ACTIVE, EXPIRED, BLOCKED), 5-bracket Expiry Dashboard |
| 13 | `InventoryModule` | `/api/inventory` | Live stock overview, low/critical stock alerts, adjustments, inter-branch transfers |
| 14 | `PurchasesModule` | `/api/purchases` | Purchase orders, GRN inward invoices, batch auto-creation, supplier ledger updates |
| 15 | `SalesModule` | `/api/sales` | Invoices listing, detail lookup, thermal receipt data formatting |
| 16 | `PosModule` | `/api/pos` | Quick barcode scanning, cart hold/resume, atomic FEFO checkout |
| 17 | `SalesReturnsModule` | `/api/sales-returns` | Customer returns, resalable batch stock restore, damaged/expired stock routing |
| 18 | `PurchaseReturnsModule` | `/api/purchase-returns` | Supplier returns, debit notes, batch stock deduction, supplier balance decrement |
| 19 | `PrintingModule` | `/api/printing` | Thermal receipt generation (58mm/80mm ESC/POS byte stream), printer management |
| 20 | `InvoicesModule` | `/api/invoices` | Vector A4 PDF Tax Invoice generation via PDFKit |
| 21 | `ExpensesModule` | `/api/expenses` | Daily business expenses, category classification, attachments |
| 22 | `FinancialsModule` | `/api/financials` | P&L calculation, COGS by batch cost, gross profit margins, GST liability, cash summary |
| 23 | `ReportsModule` | `/api/reports` | Sales reports, purchase reports, inventory valuation, Excel (.xlsx) export |
| 24 | `DashboardModule` | `/api/dashboard` | Real-time executive KPIs: today sales, today profit, 7-day trend, top 5 medicines |
| 25 | `AuditModule` | `/api/audit` | Queryable audit trail with filtering by user, entity, action, and date range |
| 26 | `NotificationsModule` | `/api/notifications` | In-app alerts: low stock, expiry warning, system broadcasts, unread counter |
| 27 | `BackupModule` | `/api/backup` | Full JSON database snapshot export and timestamped backup listing |
| 28 | `ImportExportModule` | `/api/import-export` | Opening stock bulk CSV/JSON wizard with batch generation & stock movements |

---

## 3. Detailed REST API Endpoint & DTO Matrix

### 3.1 Authentication & Profile (`/api/auth`, `/api/users`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | `@Public()` | Authenticate user via email/mobile & password | `LoginDto { email?, mobile?, password }` | `AuthTokens { accessToken, refreshToken, expiresIn, user }` |
| `POST` | `/api/auth/refresh` | `@Public()` | Rotate refresh token | `{ refreshToken: string }` | `AuthTokens` |
| `POST` | `/api/auth/logout` | Authenticated | Revoke session(s) | `{ refreshToken?: string }` | `{ success: boolean, message: string }` |
| `POST` | `/api/auth/change-password` | Authenticated | Change current password | `ChangePasswordDto { currentPassword, newPassword, confirmPassword }` | `{ success: boolean, message: string }` |
| `GET` | `/api/users/me` | Authenticated | Get current authenticated user profile | None | `User` with roles, permissions, branches |
| `PATCH` | `/api/users/me` | Authenticated | Update personal profile details | `UpdateUserDto { firstName?, lastName?, mobile? }` | `User` |
| `GET` | `/api/users` | `user.manage` | List users with pagination | Query: `{ page, limit, search, roleId, branchId }` | `PaginatedResult<User>` |
| `POST` | `/api/users` | `user.manage` | Create new staff user | `CreateUserDto { email, password, firstName, lastName, roleIds, branchIds }` | `User` |
| `PATCH` | `/api/users/:id` | `user.manage` | Update user account | `UpdateUserDto` | `User` |
| `DELETE` | `/api/users/:id` | `user.manage` | Deactivate user account | None | `User (isActive: false)` |

### 3.2 Master Data & Settings (`/api/settings`, `/api/branches`, `/api/roles`, `/api/categories`, `/api/manufacturers`, `/api/units`, `/api/medicines`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `GET` | `/api/settings/public` | `@Public()` | Get public branding & store profile | None | `{ name, logo, phone, address, currencySymbol, primaryColor, ... }` |
| `GET` | `/api/settings/business` | Authenticated | Get full business settings | None | `BusinessSettings` |
| `PATCH` | `/api/settings/business` | `settings.manage` | Update business settings | `UpdateBusinessSettingsDto` | `BusinessSettings` |
| `GET` | `/api/settings/branding` | Authenticated | Get branding colors & logos | None | `BusinessBranding` |
| `PATCH` | `/api/settings/branding` | `settings.manage` | Update branding config | `UpdateBusinessBrandingDto` | `BusinessBranding` |
| `GET` | `/api/settings/receipt-template` | Authenticated | Get thermal receipt template | None | `ReceiptTemplate` |
| `PATCH` | `/api/settings/receipt-template` | `settings.manage` | Update receipt template | `UpdateReceiptTemplateDto` | `ReceiptTemplate` |
| `GET` | `/api/branches` | Authenticated | List all physical branches | None | `Branch[]` with settings |
| `POST` | `/api/branches` | `branch.manage` | Create branch & initialize settings | `CreateBranchDto` | `Branch` |
| `PATCH` | `/api/branches/:id` | `branch.manage` | Update branch info | `UpdateBranchDto` | `Branch` |
| `PATCH` | `/api/branches/:id/settings` | `branch.manage` | Update invoice prefix/sequence | `UpdateBranchSettingsDto` | `BranchSettings` |
| `GET` | `/api/roles` | `role.manage` | List all roles | None | `Role[]` with permissions |
| `GET` | `/api/roles/permissions` | `role.manage` | List all 40+ system permissions | None | `Permission[]` |
| `POST` | `/api/roles` | `role.manage` | Create custom role | `CreateRoleDto` | `Role` |
| `PATCH` | `/api/roles/:id` | `role.manage` | Update role permissions | `UpdateRoleDto` | `Role` |
| `GET` | `/api/medicines` | `medicine.view` | Paginated search of medicines | Query: `{ search, categoryId, manufacturerId, branchId, page, limit }` | `PaginatedResult<MedicineWithStock>` |
| `GET` | `/api/medicines/barcode/:code` | `medicine.view` | Quick lookup by Barcode/SKU/GTIN | Query: `{ branchId? }` | `Medicine` with active FEFO batches |
| `GET` | `/api/medicines/:id` | `medicine.view` | Medicine detail with batches | Query: `{ branchId? }` | `Medicine` with batches & stock counts |
| `POST` | `/api/medicines` | `medicine.create` | Create new medicine | `CreateMedicineDto` | `Medicine` |
| `PATCH` | `/api/medicines/:id` | `medicine.edit` | Update medicine | `UpdateMedicineDto` | `Medicine` |
| `DELETE` | `/api/medicines/:id` | `medicine.delete` | Soft delete medicine | None | `Medicine (isActive: false)` |

### 3.3 Batches & Live Inventory (`/api/batches`, `/api/inventory`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `GET` | `/api/batches` | `inventory.view` | List batches with filters | Query: `{ branchId, medicineId, status, page, limit }` | `PaginatedResult<Batch>` |
| `GET` | `/api/batches/expiry-dashboard` | `inventory.view` | 5-bracket Expiry Analytics | Query: `{ branchId? }` | `{ summary, expired, expiring7, expiring30, expiring60, expiring90 }` |
| `GET` | `/api/batches/:id` | `inventory.view` | Batch detail with movements | None | `Batch` with recent 20 movements |
| `PATCH` | `/api/batches/:id/status` | `inventory.adjust` | Update batch status | `{ status: BatchStatus }` | `Batch` |
| `GET` | `/api/inventory/overview` | `inventory.view` | Live stock levels across branches | Query: `{ branchId, search, page, limit }` | `PaginatedResult<StockOverviewItem>` |
| `GET` | `/api/inventory/low-stock` | `inventory.view` | Low, critical & out-of-stock items | Query: `{ branchId? }` | `{ summary, lowStock, criticalStock, outOfStock }` |
| `GET` | `/api/inventory/movements` | `inventory.view` | Immutable stock movement ledger | Query: `{ branchId, medicineId, batchId, type, page, limit }` | `PaginatedResult<StockMovement>` |
| `POST` | `/api/inventory/adjustments` | `inventory.adjust` | Perform stock adjustment | `CreateStockAdjustmentDto` | `StockAdjustment` |
| `POST` | `/api/inventory/transfers` | `inventory.transfer` | Initiate inter-branch stock transfer | `CreateStockTransferDto` | `StockTransfer (IN_TRANSIT)` |
| `POST` | `/api/inventory/transfers/:id/receive` | `inventory.transfer` | Receive and accept stock transfer | None | `StockTransfer (RECEIVED)` |

### 3.4 Inward Purchases & Suppliers (`/api/purchases`, `/api/suppliers`, `/api/purchase-returns`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `GET` | `/api/purchases` | `purchase.view` | List purchase invoices | Query: `{ branchId, supplierId, status, page, limit }` | `PaginatedResult<PurchaseInvoice>` |
| `GET` | `/api/purchases/:id` | `purchase.view` | Purchase invoice detail & payments | None | `PurchaseInvoice` with items & balanceDue |
| `POST` | `/api/purchases` | `purchase.create` | Create purchase (DRAFT or CONFIRMED) | `CreatePurchaseDto` | `PurchaseInvoice` |
| `POST` | `/api/purchases/:id/confirm` | `purchase.approve` | Confirm DRAFT invoice into live stock | None | `PurchaseInvoice (CONFIRMED)` |
| `POST` | `/api/purchases/:id/payments` | `purchase.create` | Record supplier payment | `RecordPurchasePaymentDto` | `PurchasePayment` |
| `GET` | `/api/suppliers` | `supplier.view` | List suppliers & balances | Query: `{ search, page, limit }` | `PaginatedResult<Supplier>` |
| `POST` | `/api/suppliers` | `supplier.create` | Add new supplier | `CreateSupplierDto` | `Supplier` |
| `GET` | `/api/purchase-returns` | `purchase.return` | List purchase returns | Query: `{ branchId, search, page, limit }` | `PaginatedResult<PurchaseReturn>` |
| `POST` | `/api/purchase-returns` | `purchase.return` | Create debit note return to supplier | `CreatePurchaseReturnDto` | `PurchaseReturn` |

### 3.5 POS Counter, Sales & Invoices (`/api/pos`, `/api/sales`, `/api/sales-returns`, `/api/printing`, `/api/invoices`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `GET` | `/api/pos/scan/:barcode` | `sale.create` | Quick scan barcode for POS cart | Query: `{ branchId }` | `Medicine` with active FEFO batches |
| `GET` | `/api/pos/held` | `sale.create` | List suspended/held carts | None | `HeldCart[]` |
| `POST` | `/api/pos/hold` | `sale.create` | Hold/suspend current POS cart | `{ name?, cart: CartDto }` | `HeldCart` |
| `POST` | `/api/pos/resume/:id` | `sale.create` | Resume held cart & delete slot | None | `CartDto` |
| `DELETE` | `/api/pos/held/:id` | `sale.create` | Delete held cart | None | `{ success: true }` |
| `POST` | `/api/pos/checkout` | `sale.create` | Execute atomic POS Checkout | `CheckoutSaleDto` | `SalesInvoice` |
| `GET` | `/api/sales` | `sale.view` | List sales invoices | Query: `{ branchId, customerId, search, page, limit }` | `PaginatedResult<SalesInvoice>` |
| `GET` | `/api/sales/:id` | `sale.view` | Sales invoice details & payments | None | `SalesInvoice` with items & returns |
| `GET` | `/api/sales/:id/receipt-data` | `sale.view` | Get thermal receipt formatted data | Query: `{ paperWidth? }` | `ThermalReceiptDataDto` |
| `GET` | `/api/printing/receipt/:id` | `sale.view` | Generate ESC/POS byte buffer | Query: `{ paperWidth? }` | `{ receiptData, escPosBase64 }` |
| `GET` | `/api/invoices/:id/pdf` | `sale.view` | Download A4 PDF Tax Invoice | None | `application/pdf` Binary Stream |
| `GET` | `/api/sales-returns` | `sale.return` | List sales returns | Query: `{ branchId, search, page, limit }` | `PaginatedResult<SalesReturn>` |
| `POST` | `/api/sales-returns` | `sale.return` | Process customer sales return | `CreateSalesReturnDto` | `SalesReturn` |

### 3.6 Financials, Analytics, Reports & Operations (`/api/financials`, `/api/reports`, `/api/dashboard`, `/api/expenses`, `/api/audit`, `/api/notifications`, `/api/backup`, `/api/import-export`)
| Method | Route | Permission / Auth | Description | Request DTO / Body | Response Schema |
|---|---|---|---|---|---|
| `GET` | `/api/financials/summary` | `report.view` | P&L, COGS, gross profit, GST breakdown | Query: `{ branchId, startDate, endDate }` | `FinancialSummaryDto` |
| `GET` | `/api/reports/sales` | `report.view` | Comprehensive sales report | Query: `{ branchId, startDate, endDate, groupBy }` | `SalesReportDto` |
| `GET` | `/api/reports/purchases` | `report.view` | Comprehensive purchase report | Query: `{ branchId, supplierId, startDate, endDate }` | `PurchaseReportDto` |
| `GET` | `/api/reports/inventory-valuation` | `report.view` | Stock valuation at Purchase & MRP | Query: `{ branchId? }` | `InventoryValuationDto` |
| `GET` | `/api/reports/inventory/export-excel` | `report.export` | Download Inventory Excel spreadsheet | Query: `{ branchId? }` | `application/vnd.openxmlformats-officedocument...` |
| `GET` | `/api/dashboard/summary` | Authenticated | Executive KPI dashboard summary | Query: `{ branchId? }` | `DashboardSummaryDto` |
| `GET` | `/api/expenses` | `expense.view` | List recorded expenses | Query: `{ branchId, category, page, limit }` | `PaginatedResult<Expense>` |
| `POST` | `/api/expenses` | `expense.create` | Record new expense | `CreateExpenseDto` | `Expense` |
| `GET` | `/api/audit` | `audit.view` | Search system audit trail | Query: `{ userId, entity, action, startDate, endDate, page, limit }` | `PaginatedResult<AuditLog>` |
| `GET` | `/api/notifications` | Authenticated | List user notifications | None | `Notification[]` |
| `GET` | `/api/notifications/unread-count` | Authenticated | Get unread alerts counter | None | `{ unreadCount: number }` |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark notification as read | None | `{ count: number }` |
| `GET` | `/api/backup` | `backup.manage` | List available database backups | None | `BackupRecord[]` |
| `POST` | `/api/backup/create` | `backup.manage` | Create on-demand JSON database backup | None | `BackupRecord` |
| `POST` | `/api/import-export/opening-stock` | `inventory.adjust` | Import Opening Stock Wizard | `{ branchId: string, rows: OpeningStockRow[] }` | `{ success: boolean, importedCount: number }` |

---

## 4. Transaction Boundaries & Guardrails

### 4.1 FEFO Dispensation Algorithm (`packages/shared-utils/src/fefo.ts`)
```typescript
export function allocateBatchesFefo(batches: Batch[], requestedQty: number): FefoResult {
  // 1. Filter ACTIVE, non-expired batches with currentQty - reservedQty > 0
  const validBatches = batches.filter(b => b.status === 'ACTIVE' && new Date(b.expiryDate) > new Date() && b.currentQty > 0);
  
  // 2. Sort strictly ascending by expiry date (earliest expiring first)
  validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // 3. Incrementally satisfy requestedQty across batches
  // Returns allocations array with exact quantity deducted from each batch
}
```

### 4.2 Atomic POS Checkout Transaction Flow (`SalesService.checkout`)
1. **Customer Resolution**: Finds existing customer by mobile or creates new customer record.
2. **Sequential Invoice Generation**: Reads current `BranchSettings.invoiceNextNumber`, constructs formatted invoice number (e.g. `BLR-000142`), and atomically increments sequence number in the same transaction.
3. **FEFO Allocation & Validation**: Validates available non-expired batch quantities; fails immediately with `400 Bad Request` if insufficient stock.
4. **Sales Invoice Creation**: Inserts `sales_invoices`, `sales_items`, and split `sales_payments` (Cash, UPI, Card, Cheque, Credit).
5. **Stock Deduction**: Decrements `batches.currentQty` for each allocated batch.
6. **Stock Movement Creation**: Inserts immutable audit records in `stock_movements` with `type = SALE`, `direction = OUT`.

### 4.3 Inward Purchase Transaction Flow (`PurchasesService.create` & `confirmPurchase`)
1. **Invoice Number Uniqueness Check**: Prevents duplicate vendor bills.
2. **Item Pricing & GST Calculation**: Uses `calculateLineTotal()` for line discounts and tax calculations.
3. **Batch Upsert**:
   * Checks if `(medicineId, branchId, batchNumber)` already exists.
   * If existing: increments `currentQty` and updates MRP/prices.
   * If new: creates new `Batch` record with `initialQty`, `currentQty`, `mfgDate`, `expiryDate`, and `status = ACTIVE`.
4. **Stock Movement Creation**: Inserts `stock_movements` with `type = PURCHASE`, `direction = IN`.
5. **Supplier Ledger Increment**: Atomically increments `Supplier.currentBalance` by invoice grand total.

### 4.4 Sales Return Transaction Flow (`SalesReturnsService.create`)
1. **Return Quantity Limit Check**: Checks previous returns against original `sales_items.qty` to guarantee that return quantity cannot exceed purchased quantity.
2. **Refund Calculation**: Calculates exact proportional refund amounts based on billed line total.
3. **Batch Routing**:
   * `RESALABLE`: Increments `Batch.currentQty` and records `stock_movements` (`type = SALES_RETURN`, `direction = IN`).
   * `DAMAGED`: Increments `Batch.damagedQty` (does not restore live stock).
   * `EXPIRED`: Increments `Batch.expiredQty` (does not restore live stock).
4. **Invoice Status Update**: Updates `SalesInvoice.status` to `RETURNED` or `PARTIALLY_RETURNED`.

---

## 5. Verification & Build Integrity

- **TypeScript Compilation**: `npm run build:api` runs `nest build` with 0 errors across all 28 modules, decorators, guards, and services.
- **Database Alignment**: Prisma schema models and relation bindings are 100% matched with all entity queries.
- **Type Safety**: Monorepo shared packages (`@medical-inventory/shared-types`, `@medical-inventory/constants`, `@medical-inventory/shared-utils`, `@medical-inventory/validation`) are cleanly linked and referenced.

---

## 6. Recommendations for Frontend & Integration Phase

1. **POS Counter Shortcuts**: Map web/desktop keybindings to API:
   * `F1`: Focus search / barcode quick-scan (`/api/pos/scan/:code`)
   * `F2`: Customer lookup / quick add (`/api/customers`)
   * `F4`: Hold cart (`/api/pos/hold`)
   * `F8`: Resume held cart (`/api/pos/resume/:id`)
   * `F9` / `Ctrl+Enter`: Checkout (`/api/pos/checkout`)
   * `F12`: Print receipt (`/api/printing/receipt/:id`)
2. **Offline-First Resilience**: Cache active medicine & batch catalogs locally in IndexedDB / SQLite on web & mobile clients, synchronizing transactions to `/api/pos/checkout` upon network reconnection.
3. **EscPos Direct Print**: Deliver raw base64 string from `/api/printing/receipt/:id` directly to ESC/POS network printers on port 9100 or Bluetooth thermal printers on mobile.
