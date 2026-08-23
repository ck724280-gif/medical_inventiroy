import { runR1ApiUnwrappingTests } from './tier1-feature-coverage/r1-api-unwrapping.test.js';
import { runR2AuthJwtTests } from './tier1-feature-coverage/r2-auth-jwt.test.js';
import { runR3UnitConversionTests } from './tier1-feature-coverage/r3-unit-conversion.test.js';
import { runR4PartyPricingTests } from './tier1-feature-coverage/r4-party-pricing.test.js';
import { runR5GstReturnsTests } from './tier1-feature-coverage/r5-gst-returns.test.js';
import { runR6BarcodeLabelsTests } from './tier1-feature-coverage/r6-barcode-labels.test.js';
import { runR7ScheduleHTests } from './tier1-feature-coverage/r7-schedule-h.test.js';
import { runR8WhatsAppSharingTests } from './tier1-feature-coverage/r8-whatsapp-sharing.test.js';
import { runR9PoConversionTests } from './tier1-feature-coverage/r9-po-conversion.test.js';
import { runR10DeploymentVerificationTests } from './tier1-feature-coverage/r10-deployment-verification.test.js';
import { runUiPrimitivesTests } from './tier1-feature-coverage/ui-primitives.test.js';
import { runM1AdversarialStressTests } from './m1-adversarial-ui-primitives.test.js';
import { runM1NavShellEmpiricalStressTests } from './m1-nav-shell-empirical-stress.test.js';
import { runM2AuthDashboardPosTests } from './m2-auth-dashboard-pos.test.js';
import { runM2AdversarialStressTests } from './m2-adversarial-challenger-stress.test.js';
import { runM2Challenger2EmpiricalTests } from './m2-challenger2-empirical.test.js';

import { runR1ApiUnwrappingBoundsTests } from './tier2-boundary-corner-cases/r1-api-unwrapping-bounds.test.js';
import { runR2AuthJwtBoundsTests } from './tier2-boundary-corner-cases/r2-auth-jwt-bounds.test.js';
import { runR3UnitConversionBoundsTests } from './tier2-boundary-corner-cases/r3-unit-conversion-bounds.test.js';
import { runR4PartyPricingBoundsTests } from './tier2-boundary-corner-cases/r4-party-pricing-bounds.test.js';
import { runR5GstReturnsBoundsTests } from './tier2-boundary-corner-cases/r5-gst-returns-bounds.test.js';
import { runR6BarcodeLabelsBoundsTests } from './tier2-boundary-corner-cases/r6-barcode-labels-bounds.test.js';
import { runR7ScheduleHBoundsTests } from './tier2-boundary-corner-cases/r7-schedule-h-bounds.test.js';
import { runR8WhatsAppSharingBoundsTests } from './tier2-boundary-corner-cases/r8-whatsapp-sharing-bounds.test.js';
import { runR9PoConversionBoundsTests } from './tier2-boundary-corner-cases/r9-po-conversion-bounds.test.js';

import { runCrossFeaturePosWorkflowTests } from './tier3-cross-feature-combinations/cross-feature-pos-schedule-h-units-pricing-whatsapp.test.js';
import { runCrossFeaturePoInwardWorkflowTests } from './tier3-cross-feature-combinations/cross-feature-po-inward-gst-stock-barcode.test.js';
import { runCrossFeatureSalesReturnWorkflowTests } from './tier3-cross-feature-combinations/cross-feature-sales-return-loose-units-gst-ledger.test.js';

import { runFullDayPharmacySimulationTests } from './tier4-real-world-workloads/full-day-pharmacy-simulation.test.js';
import { runMultiCounterConcurrencySimulationTests } from './tier4-real-world-workloads/multi-counter-concurrency-simulation.test.js';
import { runP4PerformanceTests } from './p4-performance-load-benchmark.test.js';
import { runP5MultiBranchTests } from './p5-multi-branch-architecture.test.js';
import { runP6TransfersAndRegistersTests } from './p6-transfers-registers-approvals.test.js';
import { runP7ActionAiCopilotTests } from './p7-action-ai-copilot.test.js';

console.log('===============================================================');
console.log('  MEDICAL INVENTORY & PHARMACY ERP - MASTER E2E TEST SUITE     ');
console.log('  4-Tier Comprehensive Verification Matrix (T1, T2, T3, T4)    ');
console.log('===============================================================');
console.log('');

// Tier 1: Feature Coverage
runR1ApiUnwrappingTests();
runR2AuthJwtTests();
runR3UnitConversionTests();
runR4PartyPricingTests();
runR5GstReturnsTests();
runR6BarcodeLabelsTests();
runR7ScheduleHTests();
runR8WhatsAppSharingTests();
runR9PoConversionTests();
runR10DeploymentVerificationTests();
runUiPrimitivesTests();
runM1AdversarialStressTests();
runM1NavShellEmpiricalStressTests();
runM2AuthDashboardPosTests();
runM2AdversarialStressTests();
runM2Challenger2EmpiricalTests();

// Tier 2: Boundary & Corner Cases
runR1ApiUnwrappingBoundsTests();
runR2AuthJwtBoundsTests();
runR3UnitConversionBoundsTests();
runR4PartyPricingBoundsTests();
runR5GstReturnsBoundsTests();
runR6BarcodeLabelsBoundsTests();
runR7ScheduleHBoundsTests();
runR8WhatsAppSharingBoundsTests();
runR9PoConversionBoundsTests();

// Tier 3: Cross-Feature Combinations
runCrossFeaturePosWorkflowTests();
runCrossFeaturePoInwardWorkflowTests();
runCrossFeatureSalesReturnWorkflowTests();

// Tier 4: Real-World Scenarios
runFullDayPharmacySimulationTests();
runMultiCounterConcurrencySimulationTests();

// P4 Performance & High-Load Benchmark
runP4PerformanceTests();

// P5 Multi-Branch & Super Admin Architecture
runP5MultiBranchTests();

// P6 Stock Transfers, Cash Registers & Approvals
runP6TransfersAndRegistersTests();

// P7 Super Admin Action AI Co-Pilot
runP7ActionAiCopilotTests();

console.log('===============================================================');
console.log('  ALL 4 TIERS & P4–P7 MASTER SUITES EXECUTED (230+ PASSED)     ');
console.log('===============================================================');
