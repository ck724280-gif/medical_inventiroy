# 📈 Module Documentation: Reports & Business Intelligence (`/reports`)

---

## 🎯 1. Overview & Business Purpose
The **Reports & Analytics** module delivers comprehensive financial, tax, and inventory analytics for store owners, accountants, and tax consultants. It generates GST filing summaries (GSTR-1, GSTR-3B), profit & loss statements, sales velocity rankings, and dead-stock forecasts.

---

## 📊 2. Core Report Types

### 1. Sales & Revenue Summary
* Daily, Weekly, Monthly, and Custom Date Range gross revenue.
* Split by payment modes (Cash, UPI, Card, Credit).
* Average Order Value (AOV) & Total Bills Count.

### 2. Profit & Loss Statement (P&L)
$$\text{Gross Profit} = \text{Total Sales Revenue} - \text{Cost of Goods Sold (COGS)}$$
$$\text{Net Profit} = \text{Gross Profit} - \text{Total Operating Expenses} - \text{Sales Discounts}$$

### 3. GST Compliance Reports (GSTR-1 / GSTR-3B)
* Taxable Value, CGST (6%/9%), SGST (6%/9%), and IGST (12%/18%) breakdowns.
* B2B Invoices with Customer GSTIN listed separately.
* HSN-wise tax breakdown summary.

### 4. Dead Stock & Expiry Loss Radar
* Items with 0 sales velocity over the last 90/180 days.
* Financial valuation of inventory expiring within 30, 60, and 90 days.

---

## 📡 3. Backend Endpoints

* `GET /api/reports/sales-summary`: Aggregated sales metrics.
* `GET /api/reports/profit-loss`: Net profit calculation.
* `GET /api/reports/gst-summary`: Tax filing data.
* `GET /api/reports/dead-stock`: Unsold inventory report.
