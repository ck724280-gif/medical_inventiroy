# 🏥 MedCare Pharmacy ERP & Fast POS Billing System
## 📖 Comprehensive System Documentation & Technical Manual (`read-me/`)

Welcome to the official technical and operational documentation repository for the **MedCare Medical Inventory, Pharmacy ERP & POS Billing System**. This system is an enterprise-grade, multi-branch, high-performance web platform designed specifically for retail pharmacies, hospital dispensaries, and wholesale pharmaceutical distributors in India.

---

## 📑 Master Documentation Index

Click any module below to view its comprehensive operational guide, calculation formulas, database relations, and API endpoints:

### 💼 Operations & Point of Sale (POS)
| Documentation Guide | Description | Key Functions |
|---|---|---|
| 📊 [**`dashboard.md`**](./dashboard.md) | Central Command Dashboard | Real-time KPIs, Today's Sales/Profit, FEFO Expiry Radar, Low Stock Triggers, Multi-Branch Selector. |
| 🛒 [**`pos_billing.md`**](./pos_billing.md) | High-Speed POS Counter | Barcode Scanning, Schedule H Rx Modal, Split Payments, Auto Round-Off (Floor ₹33), Thermal 58/80mm & A4/A5 Bills. |
| 💵 [**`cash_register.md`**](./cash_register.md) | Cashier Shift & Float Reconciliation | Opening Float, Multi-mode Tracking, Cash Deductions, Discrepancy Auditing (Surplus / Shortage). |
| 🧾 [**`sales_invoices.md`**](./sales_invoices.md) | Sales History & Invoices | Historical Sales Ledger, Search & Filter, Credit Invoices, Reprint & PDF Receipts. |
| 🔄 [**`sales_returns.md`**](./sales_returns.md) | Sales Return & Refunds | Return Authorization, Restock Status (Damaged / Expired / Resalable), Cash vs UPI Refunds. |

---

### 📦 Inventory & Supply Chain Management
| Documentation Guide | Description | Key Functions |
|---|---|---|
| 💊 [**`medicines.md`**](./medicines.md) | Master Medicine Catalog | Generic Name Mapping, HSN Codes, Strip/Tablet Packaging Ratios, Schedules H/H1/X, Barcodes. |
| 📦 [**`inventory_batches.md`**](./inventory_batches.md) | Batch Inventory & FEFO Engine | Batch Numbers, Expiry Dates, Automated FEFO Stock Allocation, Stock Adjustments, Expiry Alerts. |
| 🚚 [**`purchases.md`**](./purchases.md) | Purchase Inward & GRN | Supplier Purchase Bills, Automatic Batch Generation, Input Tax Credit (ITC), Central Allocation. |
| 📋 [**`purchase_orders.md`**](./purchase_orders.md) | Purchase Orders (PO) | Reorder Level Triggers, PO Generation, Supplier Approval Workflow, Auto-conversion to GRN. |
| 🔄 [**`stock_transfers.md`**](./stock_transfers.md) | Inter-Branch Stock Transfers | Transfer Requests, In-Transit Dispatch, Destination Branch Receiving & Automatic Batch Merging. |
| 📥 [**`opening_closing_stock.md`**](./opening_closing_stock.md) | Bulk Data Import & Stock Audit | Excel/CSV Import, Opening Balances, Physical Audit Reconciliation, Stock Write-offs. |

---

### 👥 People & Directory Ledgers
| Documentation Guide | Description | Key Functions |
|---|---|---|
| 👤 [**`customers.md`**](./customers.md) | Patients & Customer Directory | Customer Profile, Phone Search, Credit Limits, Outstanding Balance Ledgers, Rx Archival. |
| 🏢 [**`suppliers.md`**](./suppliers.md) | Distributors & Manufacturers | Supplier Directory, Drug License/GSTIN Records, Purchase Invoices, Payment Vouchers. |

---

### 💰 Finance, Expenses & Analytics
| Documentation Guide | Description | Key Functions |
|---|---|---|
| ☕ [**`expenses.md`**](./expenses.md) | Daily & Operational Expenses | Petty Cash (Tea/Snacks, Courier), Operational Expenses (Rent, Electricity, Salaries), Ledger Deductions. |
| 📈 [**`reports_analytics.md`**](./reports_analytics.md) | Reports & Business Intelligence | Sales Velocity, Net Margins, GST GSTR-1 & GSTR-3B Tax Summaries, Dead Stock & Expiry Loss Forecasts. |

---

### ⚙️ Management, UI & Communication
| Documentation Guide | Description | Key Functions |
|---|---|---|
| 🎨 [**`settings.md`**](./settings.md) | Store Settings & UI Theme Studio | Pharmacy Profile, DL/GSTIN Setup, 8 Fonts + 9 Color Themes + Dark Surfaces, Google Drive Backups. |
| 💬 [**`whatsapp_integration.md`**](./whatsapp_integration.md) | WhatsApp Web Sharing | Zero-API WhatsApp Web Redirect, Instant Digital Bill Sharing, Payment Reminders. |
| 🤖 [**`ai_copilot.md`**](./ai_copilot.md) | Floatable / Draggable AI Co-Pilot | Mouse Drag (PC) & Touch Drag (Mobile), Position Memory, Real-time Sales Insights, Stock Queries. |

---

### 🛡️ Super Admin & Enterprise Governance
| Documentation Guide | Description | Key Functions |
|---|---|---|
| 🏛️ [**`super_admin_control_center.md`**](./super_admin_control_center.md) | Enterprise Super Admin Hub | Organization-wide Analytics, Multi-branch Comparison, Centralized System Controls. |
| 🌿 [**`super_admin_branches.md`**](./super_admin_branches.md) | Branch Management | Multi-store Creation, Branch Code/Prefix (`MAIN-01`, `BR-02`), Main Branch Delete Protection. |
| 👨‍💼 [**`super_admin_staff.md`**](./super_admin_staff.md) | Staff Directory & Granular RBAC | User Creation, Branch Assignment, Role Permissions (Cashier, Pharmacist, Manager, Super Admin). |
| 🏥 [**`super_admin_system_health.md`**](./super_admin_system_health.md) | System Health & Backups | PostgreSQL Connection Status, API Latency Monitoring, Automated JSON Database Exports. |
| 🏗️ [**`architecture_and_database.md`**](./architecture_and_database.md) | Architecture & Database Schema | NestJS Monorepo, Prisma ORM Models, Multi-Tenant Branch Isolation, JWT & Security Guards. |

---

## 💻 Tech Stack Overview

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Zustand State Management, GSAP Transitions.
- **Backend API**: NestJS 10, TypeScript, Prisma ORM 5, PostgreSQL (Neon Serverless / Cloud DB).
- **Architecture**: Turborepo Monorepo with isolated packages (`@medical-inventory/shared-utils`, `@medical-inventory/shared-types`, `@medical-inventory/constants`, `@medical-inventory/validation`).
- **Deployment**: Live on Render Cloud with Continuous Deployment Webhooks.
