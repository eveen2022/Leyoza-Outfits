import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateRows } from '../lib/pagination.js';
import { newDraft } from '../lib/invoice.js';

test('new invoices leave their number blank for manual entry', () => {
  assert.equal(newDraft().number, '');
  assert.equal(newDraft().items.length, 1);
  assert.equal(newDraft().fulfillment, 'Store Pickup');
});

test('10 and 100 products stay ordered, whole, and appear exactly once', () => {
  for (const count of [1, 5, 10, 23, 100]) {
    const heights = Array.from({ length: count }, (_, i) => i % 3 ? 62 : 106);
    const pages = paginateRows(heights, 500, 300);
    const indexes = pages.flatMap(({ start, end }) => Array.from({ length: end - start }, (_, i) => start + i));
    assert.deepEqual(indexes, Array.from({ length: count }, (_, i) => i));
    pages.forEach(({ start, end }, i) => {
      assert.ok(heights.slice(start, end).reduce((sum, height) => sum + height, 0) <= (i === pages.length - 1 ? 300 : 500));
    });
  }
});

test('an item that leaves no room for totals gets a separate totals page', () => {
  assert.deepEqual(paginateRows([350], 500, 300), [{ start: 0, end: 1 }, { start: 1, end: 1 }]);
  assert.throws(() => paginateRows([501], 500, 300));
  assert.throws(() => paginateRows([62], 500, -1));
});
