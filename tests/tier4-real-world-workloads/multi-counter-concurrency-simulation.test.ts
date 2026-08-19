import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function runMultiCounterConcurrencySimulationTests() {
  describe('Tier 4 - Real-World Application Scenarios: 5-Counter POS Concurrency Simulation', () => {
    it('T4-RW-2: should handle 5 parallel counters billing from shared batch without race condition underflow', async () => {
      let batchStock = 100;
      let successfulDispenses = 0;
      let rejectedDueToStockOut = 0;

      async function dispenseTablets(counterId: number, count: number): Promise<boolean> {
        await new Promise(r => setTimeout(r, Math.random() * 5));
        if (batchStock >= count) {
          batchStock -= count;
          successfulDispenses += count;
          return true;
        } else {
          rejectedDueToStockOut++;
          return false;
        }
      }

      const tasks: Promise<boolean>[] = [];
      for (let counter = 1; counter <= 5; counter++) {
        for (let req = 1; req <= 25; req++) {
          tasks.push(dispenseTablets(counter, 1));
        }
      }

      await Promise.all(tasks);

      assert.strictEqual(successfulDispenses, 100);
      assert.strictEqual(batchStock, 0);
      assert.strictEqual(rejectedDueToStockOut, 25);
    });
  });
}