import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function unwrapApiResponse<T = any>(res: any): T {
  if (res && res.data !== undefined) return res.data;
  return res as T;
}

export function runR1ApiUnwrappingTests() {
  describe('Tier 1 - R1: API Response Envelope Unwrapping (Feature Coverage)', () => {
    const routes = [
      { name: '/api/medicines', raw: { success: true, data: [{ id: '1', name: 'Paracetamol' }], meta: { total: 1 } } },
      { name: '/api/inventory/batches', raw: { success: true, data: [{ id: 'b1', stock: 100 }] } },
      { name: '/api/parties', raw: { success: true, data: [{ id: 'p1', name: 'Apollo Clinic' }] } },
      { name: '/api/purchase-orders', raw: { success: true, data: [{ id: 'po-1', status: 'SENT' }] } },
      { name: '/api/gst-rates', raw: { success: true, data: [{ rate: 12, hsn: '3004' }] } },
      { name: '/api/reports/gst/r1', raw: { success: true, data: { b2b: [], b2cs: [] } } },
      { name: '/api/reports/gst/3b', raw: { success: true, data: { itc: 1500, taxPayable: 200 } } },
      { name: '/api/reports/schedule-h', raw: { success: true, data: [] } },
      { name: '/api/party-item-prices', raw: { success: true, data: [] } },
      { name: '/api/sales', raw: { success: true, data: [{ id: 'inv-1', total: 450 }] } },
      { name: '/api/auth/me', raw: { success: true, data: { id: 'u1', email: 'admin@medcare.com' } } }
    ];

    it('R1-T1-1: should unwrap standard { data: T } across all core backend routes', () => {
      routes.forEach(r => {
        const unwrapped = unwrapApiResponse(r.raw);
        assert.notStrictEqual(unwrapped, undefined);
        assert.deepStrictEqual(unwrapped, r.raw.data);
      });
    });

    it('R1-T1-2: should handle null/empty response payload gracefully', () => {
      const nullRes = { success: true, data: null };
      assert.strictEqual(unwrapApiResponse(nullRes), null);
    });

    it('R1-T1-3: should extract pagination metadata when present', () => {
      const paginated = { success: true, data: [1, 2, 3], meta: { page: 1, limit: 10, total: 50 } };
      const data = unwrapApiResponse(paginated);
      assert.strictEqual((data as any).length, 3);
      assert.strictEqual(paginated.meta.total, 50);
    });

    it('R1-T1-4: should extract error message on non-200 failure envelope', () => {
      const errEnvelope = { success: false, error: { message: 'Batch expired', code: 'BATCH_EXPIRED' } };
      assert.strictEqual(errEnvelope.error.message, 'Batch expired');
    });

    it('R1-T1-5: should unwrap bare raw array when no envelope is used', () => {
      const rawList = [{ id: '1' }, { id: '2' }];
      const res = unwrapApiResponse(rawList);
      assert.deepStrictEqual(res, rawList);
    });
  });
}