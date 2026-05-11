import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

// Note: these tests require `npm run build` first.
// They test the compiled dist/ output.

test('examples folder contains all required demos', () => {
  const files = readdirSync('examples').filter((name) => name.endsWith('.cop.json'));
  assert.ok(files.includes('research-memo.cop.json'), 'missing research-memo');
  assert.ok(files.includes('code-review.cop.json'), 'missing code-review');
  assert.ok(files.includes('meeting-decision.cop.json'), 'missing meeting-decision');
  assert.ok(files.includes('product-prd.cop.json'), 'missing product-prd');
  assert.ok(files.includes('contract-review.cop.json'), 'missing contract-review');
});

test('operation-patch example exists', () => {
  const files = readdirSync('examples');
  assert.ok(files.includes('operation-patch.json'), 'missing operation-patch.json');
});
