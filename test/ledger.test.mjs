import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRelease, claimRelease, approveAttempt, beginDeployment,
  recordService, finalizeAttempt, RELEASE_STATUSES, SERVICE_STATUSES,
} from '../.github/release/ledger.mjs';

const sha = 'a'.repeat(40);

test('one approval, deploy, and final success', () => {
  let { state } = claimRelease(null, sha, 'attempt-1');
  assert.equal(state.status, RELEASE_STATUSES.PENDING);
  const approved = approveAttempt(state, 'attempt-1');
  assert.equal(approved.ok, true);
  state = approved.state;
  state = beginDeployment(state, 'attempt-1').state;
  state = recordService(state, 'attempt-1', 'backend', SERVICE_STATUSES.SUCCEEDED).state;
  state = recordService(state, 'attempt-1', 'web', SERVICE_STATUSES.SUCCEEDED).state;
  state = recordService(state, 'attempt-1', 'image', SERVICE_STATUSES.SUCCEEDED).state;
  state = finalizeAttempt(state, 'attempt-1').state;
  assert.equal(state.status, RELEASE_STATUSES.SUCCEEDED);
});

test('duplicate successful SHA is skipped', () => {
  const release = createRelease(sha, 'attempt-1');
  release.status = RELEASE_STATUSES.SUCCEEDED;
  assert.equal(claimRelease(release, sha, 'attempt-2').action, 'SKIP_SUCCEEDED');
});

test('partial failure preserves successful service and allows retry', () => {
  let state = createRelease(sha, 'attempt-1');
  state = approveAttempt(state, 'attempt-1').state;
  state = beginDeployment(state, 'attempt-1').state;
  state = recordService(state, 'attempt-1', 'backend', SERVICE_STATUSES.SUCCEEDED).state;
  state = recordService(state, 'attempt-1', 'web', SERVICE_STATUSES.FAILED).state;
  state = recordService(state, 'attempt-1', 'image', SERVICE_STATUSES.SUCCEEDED).state;
  state = finalizeAttempt(state, 'attempt-1').state;
  assert.equal(state.status, RELEASE_STATUSES.FAILED);
  assert.equal(state.last_success.backend, sha);
  assert.equal(state.last_success.web, null);
  const retry = claimRelease(state, sha, 'attempt-2');
  assert.equal(retry.action, 'RETRY_ALLOWED');
  assert.equal(retry.state.last_success.backend, sha);
});
