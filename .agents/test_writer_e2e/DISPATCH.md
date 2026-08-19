## 2026-08-19T13:53:03Z
You are the E2E Test Suite Architect & Writer for the Medical Inventory & Pharmacy ERP project.
Working directory: d:/antigravity programme/medical_inventory/.agents/test_writer_e2e
Authoritative Request: d:/antigravity programme/medical_inventory/.agents/ORIGINAL_REQUEST.md

Tasks:
1. Read d:/antigravity programme/medical_inventory/.agents/ORIGINAL_REQUEST.md.
2. Design and create the E2E opaque-box test suite for all features (R1 through R9 and deployment verification R10).
3. Follow the 4-tier methodology:
   - Tier 1: Feature Coverage (>=5 tests per feature covering R1-R9: API unwrapping, Auth/JWT, Unit Conversion Engine, Party Pricing Matrix, GST Returns, Barcode Labeling, Schedule H/H1 Register, WhatsApp Generator, Purchase Order auto-conversion).
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature for zero stock, fractional units, negative discounts, missing tax rates, expired batches, malformed phone numbers, empty PO lines, invalid tokens, etc.).
   - Tier 3: Cross-Feature Combinations (e.g. Schedule H medicine sold with Unit Conversion in POS + Party Pricing applied + WhatsApp invoice generated + stock deducted in loose units; PO converted to Inward Purchase Bill + GST auto-calculated + Stock updated).
   - Tier 4: Real-World Application Scenarios (complete pharmacy daily operations workflows).
4. Create test runner scripts (e.g. executable Node.js / Jest / Playwright / TS test scripts under a dedicated tests/ directory or packages/test-suite).
5. Document everything in TEST_INFRA.md and publish TEST_READY.md at project root (or working directory).
6. Report back when ready with handoff.md and summary.
