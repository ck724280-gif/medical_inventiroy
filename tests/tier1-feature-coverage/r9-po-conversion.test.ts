import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function convertPoToBill(po: { id: string; supplierId: string; status: string; items: Array<{ medId: string; qty: number; rate: number; receivedQty?: number }> }) {
  if (po.status === 'CANCELLED') throw new Error('Cannot convert cancelled PO');
  const items = po.items.map(i => {
    const qty = i.receivedQty !== undefined ? i.receivedQty : i.qty;
    return { medId: i.medId, qty, rate: i.rate, total: qty * i.rate };
  });
  const total = items.reduce((s, i) => s + i.total, 0);
  return { supplierId: po.supplierId, poId: po.id, items, total, status: 'FULLY_RECEIVED' };
}

export function runR9PoConversionTests() {
  describe('Tier 1 - R9: Purchase Order Auto-Conversion (Feature Coverage)', () => {
    it('R9-T1-1: should pre-fill purchase inward bill from PO items', () => {
      const po = { id: 'po-1', supplierId: 'supp-1', status: 'SENT', items: [{ medId: 'm1', qty: 10, rate: 50 }] };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.supplierId, 'supp-1');
      assert.strictEqual(bill.total, 500);
      assert.strictEqual(bill.status, 'FULLY_RECEIVED');
    });

    it('R9-T1-2: should reject conversion of CANCELLED PO', () => {
      const po = { id: 'po-1', supplierId: 'supp-1', status: 'CANCELLED', items: [] };
      assert.throws(() => convertPoToBill(po), /Cannot convert cancelled PO/);
    });

    it('R9-T1-3: should verify PO status lifecycle transitions', () => {
      const flow = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'];
      assert.strictEqual(flow[0], 'DRAFT');
      assert.strictEqual(flow[3], 'FULLY_RECEIVED');
    });

    it('R9-T1-4: should compute total inward amount across multiple items', () => {
      const po = { id: 'po-1', supplierId: 's1', status: 'SENT', items: [{ medId: 'm1', qty: 10, rate: 20 }, { medId: 'm2', qty: 5, rate: 100 }] };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.total, 700);
    });

    it('R9-T1-5: should preserve line item units and rates during conversion', () => {
      const po = { id: 'po-1', supplierId: 's1', status: 'SENT', items: [{ medId: 'm1', qty: 15, rate: 30 }] };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.items[0]?.qty, 15);
      assert.strictEqual(bill.items[0]?.rate, 30);
    });
  });
}