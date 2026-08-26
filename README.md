# MedCare — Medical Inventory & Pharmacy ERP / POS

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-blue)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)](https://tailwindcss.com/)

**MedCare** is a single-business, multi-branch medical inventory and pharmacy ERP/POS monorepo. The project combines a Next.js web application, NestJS REST API, PostgreSQL/Prisma data layer, a React Native/Expo mobile application, shared TypeScript packages, role-based access control, inventory and batch management, POS billing, reporting, printing, and pharmacy-oriented workflows.

> **Important:** This README is intentionally based on the repository structure, package manifests, Prisma schema, project documentation, and existing test/audit documentation. Some documented milestones and enhancement specifications are planned or under active development and should not be interpreted as fully implemented unless reflected in source code.

---

## ✨ Core Capabilities

### 🏢 Multi-Branch Business Architecture

- Single PostgreSQL database with branch-level operational isolation through `branchId` relationships.
- Branch memberships and branch context switching.
- Branch-specific settings, invoice numbering, printers, stock, sales, purchases, expenses, transfers, returns, shifts, approvals, and WhatsApp session data.
- Centralized business branding and configuration.

### 💊 Medicine & Catalog Management

The Prisma data model includes dedicated entities for:

- Medicines
- Medicine categories and hierarchical sub-categories
- Manufacturers
- Units and medicine unit conversions
- Barcodes
- Batch inventory
- Drug schedules and prescription requirements
- HSN/tax information
- Reorder levels and maximum stock limits

The `Medicine` model also contains operational pricing, packaging, dosage-form, schedule, barcode, tax, and stock-control fields.

### 📦 Batch Inventory & Stock Ledger

The inventory model is batch-oriented and supports stock movement tracking for operational events such as:

- Purchases
- Sales
- Adjustments
- Inter-branch transfers
- Sales returns
- Purchase returns
- Opening stock

The project documentation also specifies FEFO-style expiry handling and expiry protection for controlled dispensing workflows.

### 🧾 POS Billing & Cash Register

The web application contains a dedicated POS workflow with:

- Fast product search and barcode scanning
- Keyboard-oriented billing flow
- Hold/resume cart workflow
- Cash register shift/session handling
- Split payment support
- Customer credit/ledger workflows
- Invoice and receipt printing

The frontend dependencies include barcode scanning, print tooling, React Query, Zustand, charting, and UI animation libraries.

### 💰 Purchases, Sales & Returns

The domain model and application structure cover:

- Purchase invoices
- Purchase orders
- Sales invoices
- Purchase returns
- Sales returns
- Supplier/customer relationships
- Party-specific pricing structures
- Expenses and payouts
- Customer credit records

### 📊 Reports & Business Analytics

The repository includes reporting infrastructure for areas such as:

- Financial summaries / P&L-oriented reporting
- Sales ledger
- Purchase ledger
- Inventory valuation
- GST-oriented reporting
- HSN summaries
- Schedule H / H1 / X-oriented register workflows

Excel/CSV-oriented export tooling is supported by backend dependencies and the documented report workflows.

### 🖨️ Printing & Barcode Labels

The project includes printing infrastructure for pharmacy documents and thermal workflows, including:

- Thermal receipt printing
- A4/A5 browser-print workflows
- Receipt customization
- Barcode rendering/printing support
- Business branding on printed documents

The web app uses `react-to-print` and `react-barcode`, while the API includes PDF/QR generation libraries.

### 🤖 AI Integration

The backend includes Google's Generative AI SDK (`@google/generative-ai`). Business settings contain configurable AI fields including:

- Gemini API key
- AI model name
- AI enabled flag
- Temperature
- Custom AI system prompt

This provides an application-level foundation for pharmacy ERP AI features without hard-coding the model configuration.

### 📱 WhatsApp Integration

The backend includes the Baileys WhatsApp library, and the Prisma schema contains WhatsApp session/message log entities. Shared utilities also include WhatsApp formatting helpers. This provides infrastructure for customer communication workflows such as invoice/reminder messaging.

### 🔐 Authentication, RBAC & Security

The Prisma schema defines:

- Users
- Roles
- Permissions
- User-role mappings
- Role-permission mappings
- Refresh tokens
- Branch memberships
- Audit logs and security-related state

The API stack also includes JWT authentication, Passport, Argon2 password hashing, Helmet, request throttling, validation, and Swagger/OpenAPI support.

Typical roles documented by the project include:

| Role | Typical Responsibility |
|---|---|
| **SUPER ADMIN** | Global configuration, branches, permissions and administration |
| **BRANCH MANAGER** | Branch operations, approvals, reporting and oversight |
| **PHARMACIST** | Pharmacy and dispensing operations |
| **CASHIER** | POS billing and register operations |
| **INVENTORY** | Stock, batches, inward and adjustments |

Exact permissions are enforced through the application's permission system rather than only the UI.

---

## 🧱 Architecture

This repository is a monorepo built with **Turborepo + npm workspaces**.

```text
medical_inventiroy/
├── apps/
│   ├── api/          # NestJS 10 REST API
│   ├── web/          # Next.js 14 App Router web application / POS
│   └── mobile/       # React Native + Expo mobile application
│
├── packages/
│   ├── shared-types/ # Shared TypeScript types and DTO/domain contracts
│   ├── constants/    # Permissions, roles, GST slabs, units and constants
│   ├── shared-utils/ # Shared business helpers and WhatsApp formatting
│   └── validation/   # Shared validation schemas
│
├── prisma/
│   ├── schema.prisma # PostgreSQL schema and relationships
│   ├── migrations/   # Database migrations
│   └── seed/         # Seed/bootstrap data
│
├── tests/            # Feature, boundary, performance and end-to-end tests
├── PROJECT.md        # UI/UX redesign project specification and code map
└── package.json      # Workspace scripts and toolchain
```

The root workspace provides scripts for development, builds, database generation/migrations/seed, linting, testing, and cleanup.

---

## 🛠️ Technology Stack

### Web

- Next.js 14 App Router
- React 18
- Tailwind CSS
- React Query
- Zustand
- Zod
- Axios
- Recharts
- Lucide React
- `react-barcode`
- `react-to-print`
- `html5-qrcode`

### Backend

- NestJS 10
- Express platform
- Prisma 5
- PostgreSQL
- JWT / Passport
- Argon2
- Swagger
- Helmet
- Throttler
- ExcelJS
- PDFKit
- QRCode
- CSV parser/writer
- Google Generative AI SDK
- Baileys WhatsApp library

### Mobile

- React Native 0.74
- Expo 51
- Expo Camera / Barcode Scanner
- Zustand
- Axios

### Tooling

- TypeScript
- Turborepo
- npm workspaces
- Jest
- Supertest
- TSX

---

## 🗄️ Database Model Highlights

The Prisma schema contains a broad pharmacy ERP domain. Key model groups include:

**Identity & Access**
`User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `RefreshToken`, `BranchMembership`

**Business & Branches**
`BusinessSettings`, `BusinessBranding`, `Branch`, `BranchSettings`

**Medicine Master**
`MedicineCategory`, `Manufacturer`, `Unit`, `MedicineUnit`, `Medicine`, `Barcode`

**Inventory**
`Batch`, `StockMovement`, `StockAdjustment`, `StockTransfer` and related item/ledger entities

**Commercial Operations**
Sales, purchases, returns, purchase orders, customers, suppliers, expenses, pricing and credit entities

**Administration / Operations**
Cashier shifts, approvals, notifications, uploads, background jobs, branch-switch logs, printers and related configuration

**Communication**
WhatsApp sessions and WhatsApp message logs

The schema is intentionally relational and uses foreign keys, indexes, unique constraints, and cascade/restrict behaviors to enforce business relationships.

---

## 🎨 Web UI / UX Foundation

The project has a documented semantic UI foundation with reusable primitives such as:

- Badge
- Button
- Card
- DataTable
- EmptyState
- Input
- Modal
- PageHeader
- Select
- Skeleton
- SmartAutocomplete
- Tabs
- Toast

The documented shell includes:

- Grouped sidebar navigation
- Collapsible sidebar mode
- User profile footer
- Branch selector
- Global search / command palette
- Theme toggle and notifications
- Responsive mobile bottom navigation
- iOS-safe-area considerations

The dashboard and POS areas are treated as high-frequency operational screens, with the POS designed for keyboard and scanner-oriented workflows.

---

## 🧪 Testing & Quality

The repository contains a dedicated test suite with feature coverage, boundary/corner-case tests, performance/load benchmarks, and real-world end-to-end pharmacy lifecycle coverage.

Examples present in the repository include tests for:

- Thermal receipt formatting
- Receipt-formatting bounds
- Performance/load benchmarking
- Empirical stress testing
- End-to-end pharmacy lifecycle workflows

The root package exposes `test`, `test:e2e`, and `test:all` scripts.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 10.x recommended
- PostgreSQL

### 1. Clone

```bash
git clone https://github.com/ck724280-gif/medical_inventiroy.git
cd medical_inventiroy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create `.env` in the repository root. A minimal local configuration is:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medcare_db?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
PORT=4000
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

Additional settings may be required for deployments or optional integrations such as AI/WhatsApp.

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Apply database schema

For a development database:

```bash
npm run db:migrate
```

Or, when appropriate for your environment:

```bash
npm run db:push
```

### 6. Seed data

```bash
npm run db:seed
```

### 7. Run the applications

Backend:

```bash
npm run dev:api
```

Web application:

```bash
npm run dev:web
```

Run the monorepo development tasks together:

```bash
npm run dev
```

The web app defaults to port `3000`; the API configuration defaults to port `4000`.

---

## 🔧 Useful Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run workspace development tasks |
| `npm run dev:api` | Run NestJS API in watch mode |
| `npm run dev:web` | Run Next.js web app |
| `npm run dev:mobile` | Start Expo mobile app |
| `npm run build` | Build all workspace packages/apps |
| `npm run build:api` | Build backend and required shared packages |
| `npm run build:web` | Build web application |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma development migrations |
| `npm run db:push` | Push schema directly to database |
| `npm run db:seed` | Seed database |
| `npm run lint` | Lint workspaces |
| `npm test` | Run repository test runner |
| `npm run test:e2e` | Run end-to-end test entry point |
| `npm run clean` | Clean Turbo artifacts and node_modules |

---

## 🌐 Deployment Architecture

The application is structured for separate deployment of the API and web frontend:

- **API:** NestJS service
- **Web:** Next.js service
- **Database:** PostgreSQL-compatible hosted database
- **Mobile:** Expo/React Native distribution

The repository's project documentation also references Render/Vercel-style deployment patterns and a deployed API/web environment used during project verification.

Do not commit production secrets, API keys, database passwords, JWT secrets, or WhatsApp credentials to Git.

---

## 📌 Current Development Status

The repository contains both implemented application code and active project specifications. `PROJECT.md` documents a UI/UX redesign program with completed shell/dashboard/POS milestones and additional pages/features tracked as milestones. Separate survey documents also describe planned pharmacy enhancements such as packaging-unit conversion, party pricing, GST reporting, barcode labels, and legal drug-register workflows.

This means the repository should be evaluated from the **source code and tests**, not solely from design specifications when determining whether a particular feature is production-ready.

---

## 📚 Project Documentation

- **Architecture & UI/UX roadmap:** `PROJECT.md`
- **Prisma schema:** `prisma/schema.prisma`
- **Phase 1 frontend/API stability survey:** `.agents/explorer_survey_1/survey_report.md`
- **Phase 2 architecture/feature survey:** `.agents/explorer_survey_2/survey_report.md`
- **Tests:** `tests/`

---

## 📄 License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
