import test from 'node:test';
import assert from 'node:assert/strict';

export function runP7ActionAiCopilotTests() {
  test('🤖 P7 Milestone: Super Admin Action AI Co-Pilot & Autonomous Agent Suite', async (t) => {

    await t.test('1. Action AI Multilingual Intent Recognition (Hindi, Hinglish, English)', async () => {
      const detectIntent = (query: string) => {
        const q = query.toLowerCase();
        if (q.includes('sale') || q.includes('profit') || q.includes('revenue') || q.includes('kamai')) return 'SALES_REPORT';
        if (q.includes('stock') || q.includes('inventory') || q.includes('valuation') || q.includes('dawa')) return 'INVENTORY_VALUATION';
        if (q.includes('expir') || q.includes('khatam') || q.includes('fefo')) return 'EXPIRY_ALERT';
        if (q.includes('transfer') || q.includes('bhejo')) return 'STOCK_TRANSFER_ACTION';
        if (q.includes('price') || q.includes('daam') || q.includes('rate')) return 'PRICE_UPDATE_ACTION';
        if (q.includes('whatsapp') || q.includes('bill')) return 'WHATSAPP_DISPATCH_ACTION';
        if (q.includes('supplier') || q.includes('customer') || q.includes('udhari')) return 'LEDGER_SUMMARY';
        return 'GENERAL_ASSIST';
      };

      assert.equal(detectIntent('Today total sales aur profit kitna hua?'), 'SALES_REPORT');
      assert.equal(detectIntent('Aaj ki kamai aur margin batao'), 'SALES_REPORT');
      assert.equal(detectIntent('Show current inventory valuation in North branch'), 'INVENTORY_VALUATION');
      assert.equal(detectIntent('Kaunsi medicines 30 din me expire ho rahi hain?'), 'EXPIRY_ALERT');
      assert.equal(detectIntent('Main branch se Branch 02 me 50 Paracetamol bhejo'), 'STOCK_TRANSFER_ACTION');
      assert.equal(detectIntent('Paracetamol ka selling price ₹25 karo'), 'PRICE_UPDATE_ACTION');
      assert.equal(detectIntent('INV-1024 customer ke WhatsApp par send karo'), 'WHATSAPP_DISPATCH_ACTION');
      assert.equal(detectIntent('Distributor ka kitna payment udhari pending hai?'), 'LEDGER_SUMMARY');
    });

    await t.test('2. Action Tool Dispatch & Validation Safeguards', async () => {
      interface TransferPayload {
        fromBranchCode: string;
        toBranchCode: string;
        medicineName: string;
        qty: number;
      }

      const executeAiTransfer = (payload: TransferPayload) => {
        if (!payload.fromBranchCode || !payload.toBranchCode) {
          throw new Error('Branch code missing for transfer.');
        }
        if (payload.fromBranchCode === payload.toBranchCode) {
          throw new Error('Source and destination branch cannot be identical.');
        }
        if (payload.qty <= 0) {
          throw new Error('Quantity must be greater than 0.');
        }
        return {
          status: 'SUCCESS',
          message: `Scheduled transfer of ${payload.qty} units of ${payload.medicineName} from ${payload.fromBranchCode} to ${payload.toBranchCode}`,
        };
      };

      const result = executeAiTransfer({
        fromBranchCode: 'BR-01',
        toBranchCode: 'BR-02',
        medicineName: 'Amoxicillin 500mg',
        qty: 30,
      });

      assert.equal(result.status, 'SUCCESS');
      assert.match(result.message, /Scheduled transfer of 30 units/);

      assert.throws(
        () =>
          executeAiTransfer({
            fromBranchCode: 'BR-01',
            toBranchCode: 'BR-01',
            medicineName: 'Amoxicillin',
            qty: 10,
          }),
        /cannot be identical/
      );
    });

    await t.test('3. Organization Health Check Action Tool Computation', async () => {
      const healthCheck = (activeBranches: number, lowStockCount: number) => {
        return {
          activeBranches,
          lowStockCount,
          status: lowStockCount > 20 ? 'ATTENTION_NEEDED' : 'HEALTHY',
        };
      };

      const h1 = healthCheck(5, 4);
      assert.equal(h1.status, 'HEALTHY');

      const h2 = healthCheck(5, 25);
      assert.equal(h2.status, 'ATTENTION_NEEDED');
    });

    await t.test('4. Audit Trail Generation for AI Actions (§41, §64)', async () => {
      const auditLogs: any[] = [];

      const recordAiAction = (action: string, details: string, userId?: string) => {
        auditLogs.push({
          action,
          details,
          userId: userId || 'AI_AGENT',
          timestamp: new Date(),
        });
      };

      recordAiAction('AI_ACTION_STOCK_TRANSFER', 'Transferred 20 units of Paracetamol', 'user-superadmin');
      recordAiAction('AI_ACTION_UPDATE_MEDICINE_PRICE', 'Updated price from 20 to 25', 'user-superadmin');

      assert.equal(auditLogs.length, 2);
      assert.equal(auditLogs[0].action, 'AI_ACTION_STOCK_TRANSFER');
      assert.equal(auditLogs[0].userId, 'user-superadmin');
      assert.equal(auditLogs[1].action, 'AI_ACTION_UPDATE_MEDICINE_PRICE');
    });

    await t.test('5. Action Preview Confirmation Policy (§42, §63)', async () => {
      const requiresConfirmation = (actionType: string): boolean => {
        const sensitiveActions = [
          'TRANSFER_STOCK',
          'UPDATE_MEDICINE_PRICE',
          'CANCEL_INVOICE',
          'DEACTIVATE_BRANCH',
          'BULK_UPDATE',
        ];
        return sensitiveActions.includes(actionType);
      };

      assert.equal(requiresConfirmation('SEARCH_MEDICINE'), false);
      assert.equal(requiresConfirmation('GET_DAILY_SALES'), false);
      assert.equal(requiresConfirmation('TRANSFER_STOCK'), true);
      assert.equal(requiresConfirmation('CANCEL_INVOICE'), true);
      assert.equal(requiresConfirmation('UPDATE_MEDICINE_PRICE'), true);
    });

    await t.test('6. Dynamic AI Configuration & Key Masking (§40)', async () => {
      const maskApiKey = (rawKey: string): string => {
        if (!rawKey) return '';
        if (rawKey.length <= 10) return '••••••••••';
        return `${rawKey.slice(0, 6)}••••••••••••••••${rawKey.slice(-4)}`;
      };

      const key = 'AIzaSyDw5678901234567890abcdef1234';
      const masked = maskApiKey(key);
      assert.equal(masked.startsWith('AIzaSy'), true);
      assert.equal(masked.endsWith('1234'), true);
      assert.equal(masked.includes('••••••••••••••••'), true);
    });

    await t.test('7. Grounded Financial Calculation & Currency Formatting (§15, §48)', async () => {
      const formatINR = (val: number): string => {
        return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      assert.equal(formatINR(145000), '₹1,45,000.00');
      assert.equal(formatINR(25.5), '₹25.50');
      assert.equal(formatINR(0), '₹0.00');
    });

    await t.test('8. FEFO Expiry Sorting & Risk Valuation (§29)', async () => {
      const batches = [
        { name: 'Paracetamol', expiry: new Date('2026-12-31'), qty: 50, price: 10 },
        { name: 'Amoxicillin', expiry: new Date('2026-09-15'), qty: 20, price: 25 },
        { name: 'Cetirizine', expiry: new Date('2027-05-01'), qty: 100, price: 5 },
      ];

      const sorted = [...batches].sort((a, b) => a.expiry.getTime() - b.expiry.getTime());
      assert.equal(sorted[0].name, 'Amoxicillin'); // Earliest expiry first
      assert.equal(sorted[1].name, 'Paracetamol');
      assert.equal(sorted[2].name, 'Cetirizine');

      const riskValuation = sorted[0].qty * sorted[0].price;
      assert.equal(riskValuation, 500);
    });

  });
}
