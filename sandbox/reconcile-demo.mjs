import { readFileSync } from 'node:fs';
import { reconcileExpired } from '../.github/release/reconcile.mjs';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/release-pending.json', import.meta.url), 'utf8'),
);
const now = Date.now();
const result = reconcileExpired(fixture, now, 60 * 60 * 1000);
console.log(JSON.stringify({ status: result.status, reason: result.failure_reason ?? null }));
