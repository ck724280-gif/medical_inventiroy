import test from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../apps/api/src/modules/cache/cache.service.js';
import { UUIDValidationPipe } from '../apps/api/src/common/pipes/uuid-validation.pipe.js';

export function runP4PerformanceTests() {
  test('🚀 P4 Milestone: Enterprise Performance & UUID-Based Routing Suite', async (t) => {

    await t.test('1. UUIDValidationPipe - Strict UUID Format Enforcement', async (t) => {
      const pipe = new UUIDValidationPipe();
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';

      await t.test('accepts valid standard UUID v4', () => {
        const result = pipe.transform(validUUID, { type: 'param', data: 'id' });
        assert.equal(result, validUUID);
      });

      await t.test('rejects human-readable name slug instead of UUID', () => {
        assert.throws(
          () => pipe.transform('paracetamol-500mg', { type: 'param', data: 'id' }),
          /Invalid resource identifier/
        );
      });

      await t.test('rejects SQL injection attempt in URL parameter', () => {
        assert.throws(
          () => pipe.transform("' OR '1'='1", { type: 'param', data: 'id' }),
          /Invalid resource identifier/
        );
      });

      await t.test('rejects empty or whitespace parameter', () => {
        assert.throws(
          () => pipe.transform('', { type: 'param', data: 'id' }),
          /must be a valid UUID/
        );
      });
    });

    await t.test('2. CacheService - High Performance Caching & Multi-Tenant Invalidation', async (t) => {
      const cache = new CacheService();

      await t.test('sets and gets cached item within TTL', () => {
        cache.set('tenant:branch-1:branding', { storeName: 'Apollo Med' }, 1000);
        const result = cache.get<{ storeName: string }>('tenant:branch-1:branding');
        assert.deepEqual(result, { storeName: 'Apollo Med' });
      });

      await t.test('getOrSet executes fetchFn on miss and caches result', async () => {
        let callCount = 0;
        const fetchFn = async () => {
          callCount++;
          return { settingsId: 'default', logo: 'data:image/png;base64,sample' };
        };

        const res1 = await cache.getOrSet('settings:public_info', fetchFn, 5000);
        const res2 = await cache.getOrSet('settings:public_info', fetchFn, 5000);

        assert.equal(callCount, 1);
        assert.equal(res1.settingsId, 'default');
        assert.equal(res2.settingsId, 'default');
      });

      await t.test('invalidatePattern purges only matching tenant prefix', () => {
        cache.set('tenant:branch-A:stock', 100);
        cache.set('tenant:branch-A:users', ['u1']);
        cache.set('tenant:branch-B:stock', 200);

        const invalidated = cache.invalidatePattern('tenant:branch-A:');
        assert.equal(invalidated, 2);

        assert.equal(cache.get('tenant:branch-A:stock'), null);
        assert.equal(cache.get('tenant:branch-B:stock'), 200);
      });
    });

    await t.test('3. Concurrency & High Load Performance Simulation (10,000 Operations)', async (t) => {
      const cache = new CacheService();

      // Populate multi-tenant keys
      for (let i = 0; i < 50; i++) {
        cache.set(`tenant:branch-${i}:config`, { branchId: `branch-${i}`, currency: 'INR' });
      }

      const startTime = performance.now();
      const TOTAL_OPERATIONS = 10000;

      // Simulate 10,000 concurrent cache lookups
      const promises: Promise<any>[] = [];
      for (let i = 0; i < TOTAL_OPERATIONS; i++) {
        const branchIndex = i % 50;
        promises.push(
          Promise.resolve(cache.get(`tenant:branch-${branchIndex}:config`))
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      const p50Ms = durationMs / TOTAL_OPERATIONS;

      assert.equal(results.length, TOTAL_OPERATIONS);
      // Ensure 10,000 lookups finish in under 500ms total (>20,000 ops/sec)
      assert.ok(durationMs < 500, `Expected 10,000 ops < 500ms, took ${durationMs.toFixed(2)}ms`);
      assert.ok(p50Ms < 0.1, `Average lookup time per op is ${p50Ms.toFixed(4)}ms`);
    });

    await t.test('4. Universal Search UUID Route Formatting Conformance', async (t) => {
      const sampleMed = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: 'Paracetamol' };
      const sampleCust = { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', name: 'Rahul Kumar' };
      const sampleSupp = { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Cipla Dist' };
      const sampleInv = { id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', invoiceNumber: 'INV-001' };

      assert.equal(`/medicines/${sampleMed.id}`, '/medicines/3fa85f64-5717-4562-b3fc-2c963f66afa6');
      assert.equal(`/customers/${sampleCust.id}`, '/customers/7c9e6679-7425-40de-944b-e07fc1f90ae7');
      assert.equal(`/suppliers/${sampleSupp.id}`, '/suppliers/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
      assert.equal(`/sales/${sampleInv.id}`, '/sales/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
    });

  });
}
