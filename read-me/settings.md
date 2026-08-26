# 🎨 Module Documentation: Settings & UI Theme Studio (`/settings`)

---

## 🎯 1. Overview & Business Purpose
The **Settings** module centralizes pharmacy licensing, store branding, print invoice templates, automated database backups, and the **UI Theme, Typography & Appearance Studio**.

---

## 🛠️ 2. Configuration Sections

### 1. Store Profile & Drug Licensing
* Store Name, Legal Entity Name, Full Address, Contact Phone & Email.
* **Drug License Numbers** (Form 20B / Form 21B).
* **GSTIN** (15-character GST Identification Number).
* Store Logo Upload (appears on thermal receipts & A4 bills).

### 2. UI Theme, Typography & Appearance Studio
* **8 Curated Fonts**: `Inter`, `Plus Jakarta Sans`, `Poppins`, `Outfit`, `Space Grotesk`, `Roboto`, `Merriweather`, `JetBrains Mono` + Custom Font Input.
* **9 Color Presets**: Emerald, Sky, Indigo, Violet, Rose, Amber, Cyan, Forest, Slate + Custom HTML Color Picker & Hex Code.
* **UI Density Scaling**: Compact (`13px`), Default (`14px`), Comfortable (`15px`), Large (`16px`).
* **Corner Radius Styles**: Sharp (`4px`), Modern (`8px`), Smooth (`14px`), Round (`20px`).
* **Dark Atmosphere Surfaces**: Midnight Blue, Obsidian, Charcoal, Deep Navy.
* **Live Interactive Preview Sandbox**: Tests fonts, buttons, badges, and cards before applying.

### 3. Thermal Printer Setup
* Default Paper Width (`58mm` 2-inch or `80mm` 3-inch).
* Custom Header & Footer message, Thank You greeting, Return Policy text.

### 4. Database Backup & Google Drive Sync
* 1-Click Complete Database Export (`JSON` / `SQL`).
* Google Drive OAuth sync configuration.

---

## 📡 3. Backend Endpoints & State

* `GET /api/settings`: Fetch store settings.
* `PUT /api/settings`: Save business details.
* `POST /api/settings/backup`: Generate downloadable database snapshot.
* **Stores**: `useCustomThemeStore`, `useBrandingStore`.
