import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelease } from '../.github/release/ledger.mjs';
import { reconcileExpired } from '../.github/release/reconcile.mjs';

test('expires pending approval after TTL', () => {
  const release = createRelease('a'.repeat(40), 'attempt-1');
  release.created_at = '2026-01-01T00:00:00.000Z';
  const result = reconcileExpired(release, Date.parse('2026-01-01T02:00:00.000Z'), 60 * 60 * 1000);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failure_reason, 'APPROVAL_TIMEOUT');
});

test('does not auto-transition DEPLOYING', () => {
  const release = createRelease('a'.repeat(40), 'attempt-1');
  release.created_at = '2026-01-01T00:00:00.000Z';
  release.status = 'DEPLOYING';
  const result = reconcileExpired(release, Date.parse('2026-01-02T00:00:00.000Z'), 1000);
  assert.equal(result.status, 'DEPLOYING');
});
