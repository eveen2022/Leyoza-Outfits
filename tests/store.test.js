import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';
import { defaultBusiness, newDraft, totals, validateDraft, validateBusiness } from '../lib/invoice.js';

test('rounds prices in cents and ignores delivery charges for pickup', () => {
  const draft = newDraft(); draft.items = [{ description: 'Item', detail: '', qty: 3, price: 0.1 }]; draft.delivery = 999;
  assert.equal(totals(draft).total, 30);
  draft.fulfillment = 'Delivery'; draft.delivery = 250; draft.discount = 50;
  assert.equal(totals(draft).total, 20030);
});

test('validates API data while preserving unfinished drafts and account leading zeros', () => {
  const draft = newDraft(); draft.items[0].qty = '';
  assert.equal(validateDraft(draft).items[0].qty, '');
  assert.equal(validateBusiness({ ...defaultBusiness, account: '00123', paymentNote: '' }).account, '00123');
  assert.throws(() => validateBusiness({ ...defaultBusiness, bank: ' ' }));
  assert.throws(() => validateDraft({ ...draft, date: '2026-02-30' }));
  assert.throws(() => validateDraft({ ...draft, items: [] }));
  assert.throws(() => validateDraft({ ...draft, discount: -1 }));
});

test('JSON survives a new store instance, serializes writes, and preserves separate settings', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'leyoza-store-'));
  try {
    const store = createStore(directory); const initial = await store.read('draft');
    await store.save('business', { ...defaultBusiness, contact: '0112345678' });
    await Promise.all(Array.from({ length: 12 }, (_, index) => store.save('draft', { ...initial, number: `INV-${index}` })));
    const reopened = createStore(directory);
    assert.equal((await reopened.read('draft')).number, 'INV-11');
    assert.equal((await reopened.read('business')).contact, '0112345678');
    assert.deepEqual((await fs.readdir(directory)).sort(), ['business.json', 'draft.json']);
    await assert.rejects(store.save('draft', { ...initial, items: [] }));
    assert.equal((await reopened.read('draft')).number, 'INV-11');
    await fs.writeFile(path.join(directory, 'draft.json'), '{broken');
    await assert.rejects(reopened.read('draft'));
    assert.equal(await fs.readFile(path.join(directory, 'draft.json'), 'utf8'), '{broken');
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'leyoza-store-'));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
