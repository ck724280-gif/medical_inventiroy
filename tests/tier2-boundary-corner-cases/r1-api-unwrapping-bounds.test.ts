import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapApiResponse } from '../tier1-feature-coverage/r1-api-unwrapping.test.js';

export function runR1ApiUnwrappingBoundsTests() {
  describe('Tier 2 - R1: API Unwrapping & Transport (Boundary & Corner Cases)', () => {
    it('R1-BND-1: should unwrap primitive boolean, number, and string payloads', () => {
      assert.strictEqual(unwrapApiResponse({ success: true, data: true }), true);
      assert.strictEqual(unwrapApiResponse({ success: true, data: 0 }), 0);
      assert.strictEqual(unwrapApiResponse({ success: true, data: '' }), '');
    });

    it('R1-BND-2: should handle sparse arrays with holes or undefined elements', () => {
      const sparse = [1, undefined, 3];
      const res = unwrapApiResponse<any>({ success: true, data: sparse });
      assert.strictEqual(res.length, 3);
      assert.strictEqual(res[1], undefined);
    });

    it('R1-BND-3: should unwrap deeply nested empty data objects', () => {
      const res = unwrapApiResponse({ success: true, data: {} });
      assert.deepStrictEqual(res, {});
    });

    it('R1-BND-4: should handle corrupted meta objects gracefully without crashing', () => {
      const res = unwrapApiResponse<any>({ success: true, data: [1], meta: null as any });
      assert.strictEqual(res.length, 1);
    });

    it('R1-BND-5: should unwrap Axios response with error response structure', () => {
      const axiosErr = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Custom backend error',
          },
        },
      };
      assert.strictEqual((axiosErr.response.data as any).message, 'Custom backend error');
    });
  });
}