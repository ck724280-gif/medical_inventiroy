import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertPoToBill, PurchaseOrder } from '../tier1-feature-coverage/r9-po-conversion.test.js';

export function runR9PoConversionBoundsTests() {
  describe('Tier 2 - R9: Purchase Order Auto-Conversion (Boundary & Corner Cases)', () => {
    it('R9-BND-1: should convert PO with empty line items to bill with total 0', () => {
      const emptyPo: PurchaseOrder = { id: 'PO-EMPTY', supplierId: 'supp-1', status: 'SENT', items: [] };
      const bill = convertPoToBill(emptyPo);
      assert.strictEqual(bill.total, 0);
      assert.strictEqual(bill.items.length, 0);
    });

    it('R9-BND-2: should handle partial deliveries with receivedQty 0 on specific line items', () => {
      const po: PurchaseOrder = {
        id: 'PO-PARTIAL-0',
        supplierId: 'supp-1',
        status: 'SENT',
        items: [
          { medId: 'med-1', qty: 10, rate: 50, receivedQty: 0 },
        ],
      };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.total, 0);
    });

    it('R9-BND-3: should handle free bonus stock items with rate 0', () => {
      const po: PurchaseOrder = {
        id: 'PO-FREE-ITEMS',
        supplierId: 'supp-1',
        status: 'SENT',
        items: [
          { medId: 'med-bonus', qty: 20, rate: 0.0 },
        ],
      };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.total, 0);
      assert.strictEqual(bill.items[0]?.qty, 20);
    });

    it('R9-BND-4: should handle large institutional warehouse PO with 10,000 units', () => {
      const po: PurchaseOrder = {
        id: 'PO-HOSPITAL-BULK',
        supplierId: 'supp-1',
        status: 'SENT',
        items: [
          { medId: 'med-saline', qty: 10000, rate: 25.0 },
        ],
      };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.total, 250000.0);
    });

    it('R9-BND-5: should preserve original PO ID reference in inward purchase invoice record', () => {
      const po: PurchaseOrder = { id: 'PO-REF-999', supplierId: 'supp-2', status: 'SENT', items: [] };
      const bill = convertPoToBill(po);
      assert.strictEqual(bill.poId, 'PO-REF-999');
    });
  });
}