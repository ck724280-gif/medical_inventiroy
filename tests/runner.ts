import { PrismaClient } from '@prisma/client';
import { runFefoFeatureTests } from './tier1-feature-coverage/fefo.test.js';
import { runCurrencyFeatureTests } from './tier1-feature-coverage/currency.test.js';
import { runBarcodeFeatureTests } from './tier1-feature-coverage/barcode.test.js';
import { runSequencersDateFeatureTests } from './tier1-feature-coverage/sequencers-date.test.js';
import { runThermalReceiptFeatureTests } from './tier1-feature-coverage/thermal-receipt.test.js';

import { runBatchBoundaryTests } from './tier2-boundary-corner-cases/batch-boundary.test.js';
import { runFinancialPrecisionTests } from './tier2-boundary-corner-cases/financial-precision.test.js';
import { runBarcodeEdgeCasesTests } from './tier2-boundary-corner-cases/barcode-edge-cases.test.js';
import { runReceiptFormattingBoundsTests } from './tier2-boundary-corner-cases/receipt-formatting-bounds.test.js';

import { runInwardToSalesFefoTests } from './tier3-cross-feature-combinations/inward-to-sales-fefo.test.js';
import { runSalesReturnsStockRestoreTests } from './tier3-cross-feature-combinations/sales-returns-stock-restore.test.js';
import { runCogsGrossProfitTests } from './tier3-cross-feature-combinations/cogs-gross-profit.test.js';
import { runTransactionAtomicityTests } from './tier3-cross-feature-combinations/transaction-atomicity.test.js';

import { runPharmacyCheckoutConcurrencyTests } from './tier4-real-world-workloads/pharmacy-checkout-concurrency.test.js';
import { runMultiTenderSplitPaymentTests } from './tier4-real-world-workloads/multi-tender-split-payment.test.js';
import { runEndToEndPharmacyLifecycleTests } from './tier4-real-world-workloads/end-to-end-pharmacy-lifecycle.test.js';
import { runChallenger1AdversarialStressTests } from './adversarial-challenger1-stress.test.js';
import { runChallenger2EmpiricalStressTests } from './challenger_2_empirical_stress.test.js';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('  🧪 MEDICAL INVENTORY & PHARMACY ERP/POS AUTOMATED TEST SUITE');
  console.log('================================================================');
  console.log(`  🕒 Execution Start: ${new Date().toISOString()}`);
  console.log('  📦 Initializing Test Suites Across All 4 Tiers + Adversarial...\n');

  try {
    // 1. Tier 1 - Feature Coverage
    console.log('▶ [TIER 1] Loading Feature Coverage Test Suites...');
    runFefoFeatureTests();
    runCurrencyFeatureTests();
    runBarcodeFeatureTests();
    runSequencersDateFeatureTests();
    runThermalReceiptFeatureTests();

    // 2. Tier 2 - Boundary & Corner Cases
    console.log('▶ [TIER 2] Loading Boundary & Corner Case Test Suites...');
    runBatchBoundaryTests();
    runFinancialPrecisionTests();
    runBarcodeEdgeCasesTests();
    runReceiptFormattingBoundsTests();

    // 3. Tier 3 - Cross-Feature Combinations & Transactions
    console.log('▶ [TIER 3] Loading Cross-Feature Combinations & Transaction Tests...');
    runInwardToSalesFefoTests(prisma);
    runSalesReturnsStockRestoreTests(prisma);
    runCogsGrossProfitTests();
    runTransactionAtomicityTests(prisma);

    // 4. Tier 4 - Real-World Workloads & Pharmacy Simulation
    console.log('▶ [TIER 4] Loading Real-World Pharmacy Workload Simulations...');
    runPharmacyCheckoutConcurrencyTests(prisma);
    runMultiTenderSplitPaymentTests();
    runEndToEndPharmacyLifecycleTests(prisma);

    // 5. Adversarial Verification Harness (Challenger 1)
    console.log('▶ [CHALLENGER 1] Loading Adversarial Verification Suite...');
    runChallenger1AdversarialStressTests(prisma);

    // 6. Empirical Verification & Invariant Harness (Challenger 2)
    console.log('▶ [CHALLENGER 2] Loading Receipt, Returns & COGS Invariant Suite...');
    runChallenger2EmpiricalStressTests(prisma);

    console.log('\n✅ All test suites registered with Node test runner.\n');
  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  }
}

main();
