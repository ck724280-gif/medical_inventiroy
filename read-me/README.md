# 🏥 MedCare Pharmacy ERP & Fast POS Billing System
## 📖 Master Comprehensive Buyer's Manual & Operational Documentation (`read-me/`)

Welcome to the official, in-depth technical and operational documentation repository for the **MedCare Medical Inventory, Pharmacy ERP & High-Speed POS Billing System**. 

This comprehensive documentation suite is specifically tailored for **Pharmacy Business Owners, Managing Directors, Head Pharmacists, Cashiers, Accountants, and Non-Technical Software Buyers** who want to understand every single module, calculation, workflow, and safety guard of the platform with zero prior technical knowledge.

---

## 📑 Master Documentation Index (1,000+ Words Buyer's Manuals)

Click any module below to view its comprehensive operational guide, step-by-step screenshots walkthrough, mathematical formulas, and real-world business examples:

### 💼 Operations & Point of Sale (POS)
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| 📊 [**`dashboard.md`**](./dashboard.md) | Store Owners, Directors | Live Sales KPIs, Today's Net Profit & Real Margin %, Live Cash Drawer Float, 30/60/90 Days FEFO Expiry Radar, Multi-Store Quick Switcher. |
| 🛒 [**`pos_billing.md`**](./pos_billing.md) | Cashiers, Pharmacists | F2-F10 100% Keyboard Billing, Instant Barcode Scanning, Schedule H Doctor Rx Guard, Auto Round-Off (Floor ₹33), Split Payments, Thermal & A4 Print. |
| 💵 [**`cash_register.md`**](./cash_register.md) | Store Owners, Cashiers | Shift Management, Opening Float, Multi-Payment Tracking, Cash Returns & Expenses Deduction, Automatic Discrepancy Auditing (Surplus / Shortage). |
| 🧾 [**`sales_invoices.md`**](./sales_invoices.md) | Accountants, Cashiers | Master Historical Sales Vault, Search by Bill/Customer/Date, Payment Status Tracking (PAID/CREDIT), 1-Click Instant Reprint & PDF Download. |
| 🔄 [**`sales_returns.md`**](./sales_returns.md) | Pharmacists, Cashiers | Bill-Linked Return Verification, Stock Quality Grading (`RESALABLE` vs `DAMAGED` vs `EXPIRED`), Cash Drawer vs UPI Refund Flow. |

---

### 📦 Inventory & Supply Chain Management
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| 💊 [**`medicines.md`**](./medicines.md) | Pharmacists, Purchasers | Master Drug Catalog, Generic Salt Substitutes, HSN 3004 Codes, Multi-Level Packaging (Box $\rightarrow$ Strip $\rightarrow$ Tablet conversion ratio), Drug Schedules. |
| 📦 [**`inventory_batches.md`**](./inventory_batches.md) | Inventory Heads, Store Mgrs | Batch Number & Expiry Tracking, Automated FEFO Stock Allocation Engine, Stock Adjustment Audits, 3-Stage Visual Expiry Radar. |
| 🚚 [**`purchases.md`**](./purchases.md) | Purchase Heads, Accounts | Goods Received Note (GRN) Inward, Supplier Bills, Automated Batch Creation, 10+1 Free Schemes & Landing Cost Math, GST Input Tax Credit (ITC). |
| 📋 [**`purchase_orders.md`**](./purchase_orders.md) | Procurement Officers | Reorder Safety Level Triggers, Automated PO Generation, Supplier Approval Workflows, 1-Click PO Conversion to Purchase GRN. |
| 🔄 [**`stock_transfers.md`**](./stock_transfers.md) | Chain Owners, Store Mgrs | Inter-Branch Requisitions, Outward In-Transit Tracking, Destination Receiving & Automatic Batch Merging without Duplicate Records. |
| 📥 [**`opening_closing_stock.md`**](./opening_closing_stock.md) | Onboarding Specialists | 1-Click Bulk Excel/CSV Migration, 10,000+ Medicine Import in Seconds, Pre-Import Dry-Run Validation, Financial Year Stock Audits. |

---

### 👥 People & Directory Ledgers
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| 👤 [**`customers.md`**](./customers.md) | Cashiers, CRM Managers | Regular Patient Directory, Chronic Disease Repeat Bills, Credit Limit Enforcement (Khata), Outstanding Balance WhatsApp Reminders. |
| 🏢 [**`suppliers.md`**](./suppliers.md) | Store Owners, Accounts | Wholesale Distributor Directory, Wholesale Drug License (Form 20B/21B) & GSTIN Validation, Accounts Payable Ledger, Payment Vouchers. |

---

### 💰 Finance, Expenses & Analytics
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| ☕ [**`expenses.md`**](./expenses.md) | Cashiers, Store Owners | Daily Petty Cash (Tea, Courier, Transport), Operating Expenses (Rent, Electricity, Salaries), Cash Drawer vs Bank Payment Isolation. |
| 📈 [**`reports_analytics.md`**](./reports_analytics.md) | CAs, Tax Consultants, Owners | Real-time Profit & Loss Statement (P&L), GST GSTR-1 & GSTR-3B Tax Summaries, Dead Stock Radar, Expiry Loss Valuation Forecasts. |

---

### ⚙️ Management, UI & Communication
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| 🎨 [**`settings.md`**](./settings.md) | Store Owners, Admins | Store Profile & Drug Licensing (20B/21B), UI Theme Studio (8 Fonts + 9 Colors + Dark Surfaces), Thermal Printer Customization, Cloud Backups. |
| 💬 [**`whatsapp_integration.md`**](./whatsapp_integration.md) | Cashiers, Patients | 100% Free Zero-Cost WhatsApp Web Redirect, Instant Digital Bill Sharing, Payment Reminders, Zero Third-Party API Dependency. |
| 🤖 [**`ai_copilot.md`**](./ai_copilot.md) | Store Owners, Pharmacists | Floatable / Draggable AI Co-Pilot (Mouse Drag on PC, Touch Drag on Mobile, Position Memory), Real-Time Sales & Expiry Advisory. |

---

### 🛡️ Super Admin & Enterprise Governance
| Documentation Guide | Target Audience | Key Features & Real-Life Value |
|---|---|---|
| 🏛️ [**`super_admin_control_center.md`**](./super_admin_control_center.md) | Group Directors, Chain Owners| Consolidated Multi-Branch Turnover, Real-time Branch Comparisons, Enterprise Security & Universal Password Resets. |
| 🌿 [**`super_admin_branches.md`**](./super_admin_branches.md) | Operations Heads | Multi-Store Creation, Dedicated Sequential Invoice Prefixes (`MAIN-`, `CITY-`), Dual-Layer Main Branch Deletion Safeguard. |
| 👨‍💼 [**`super_admin_staff.md`**](./super_admin_staff.md) | HR Heads, Store Owners | Granular 5-Tier RBAC Permissions Hierarchy (`CASHIER`, `PHARMACIST`, `STORE_MANAGER`, `OWNER`), Instant Account Freezes. |
| 🏥 [**`super_admin_system_health.md`**](./super_admin_system_health.md) | IT Heads, Technical Buyers | Live PostgreSQL Connection Status, API Latency < 45ms Monitoring, Automated Midnight Cloud Snapshots & Disaster Recovery. |
| 🏗️ [**`architecture_and_database.md`**](./architecture_and_database.md) | CTOs, Solution Architects | Turborepo Monorepo, NestJS 10 REST Backend, Prisma ORM 5 Schema ERD, Neon PostgreSQL Serverless Cloud, Multi-Tenant Scoping. |

---

## 💻 World-Class Technology Stack

- **Frontend Application**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Zustand State Architecture, GSAP Animation Engine.
- **Backend API Server**: NestJS 10, TypeScript, Prisma ORM 5, PostgreSQL (Neon Serverless Cloud Database).
- **Security & Integrity**: Salted Bcrypt Password Hashing, JWT Dual-Token Authentication, Granular RBAC Guards, Multi-Tenant Branch Scoping.
- **Hosting & Cloud CD**: Live on Render Cloud with automated continuous integration and deployment webhooks.
