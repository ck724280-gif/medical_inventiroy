# 💊 Module Documentation: Master Medicine Catalog (`/medicines`)

---

## 🎯 1. Overview & Business Purpose
The **Medicines Master Catalog** is the core pharmaceutical database of the ERP. It manages all drug definitions, generic compositions, manufacturers, HSN codes, drug schedule compliance (Schedule H/H1/X/OTC), barcodes, and unit packaging ratios (Box $\rightarrow$ Strip $\rightarrow$ Tablet).

---

## 📋 2. Core Fields & Attributes

| Field Name | Description | Example |
|---|---|---|
| **`Name`** | Brand / Trade Name | Augmentin 625 Duo Tablet |
| **`Generic Name`** | Active Pharmaceutical Ingredient (API) | Amoxicillin (500mg) + Clavulanic Acid (125mg) |
| **`HSN Code`** | GST Harmonized System of Nomenclature | 30049099 (12% GST) |
| **`Drug Schedule`** | Legal classification | `Schedule H` (Prescription required) |
| **`Base Unit`** | Smallest selling unit | `TABLET` or `ML` or `VIAL` |
| **`Strips Per Box`** | Packaging conversion level 2 | `10` Strips |
| **`Tablets Per Strip`** | Packaging conversion level 1 | `10` Tablets (1 Box = 100 Tablets) |
| **`MRP`** | Maximum Retail Price | ₹223.50 |
| **`Default Selling Price`** | Standard store sale rate | ₹200.00 |
| **`Default Purchase Price`** | Standard wholesale cost | ₹160.00 |
| **`Reorder Level`** | Minimum stock warning trigger | 50 Tablets |
| **`Barcode`** | EAN-13 or Code-128 barcode | `890103038291` |

---

## 🔄 3. Packaging Conversion Multiplier Formula

$$\text{Total Base Units (Tablets) in Box} = \text{Strips Per Box} \times \text{Tablets Per Strip}$$

When selling in POS:
* **1 Tablet** = $\text{Base Rate} \times 1$
* **1 Strip** = $\text{Base Rate} \times \text{Tablets Per Strip}$
* **1 Box** = $\text{Base Rate} \times (\text{Strips Per Box} \times \text{Tablets Per Strip})$

---

## 📡 4. Backend Endpoints & Database Tables

* `GET /api/medicines`: Paginated search with generic name & barcode filters.
* `POST /api/medicines`: Create new medicine with unit definitions.
* `PUT /api/medicines/:id`: Update drug master data.
* `DELETE /api/medicines/:id`: Soft deactivate / remove if no active sales exist.
* **Prisma Models**: `Medicine`, `MedicineCategory`, `Manufacturer`, `Unit`, `MedicineUnit`, `Barcode`.
