import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkflowRun } from '../.github/release/workflow-trust.mjs';

const expected = {
  repository: 'example-owner/example-repo',
  workflowId: 123456,
  workflowPath: '.github/workflows/ci.yml',
  workflowName: 'CI',
};
const sha = 'a'.repeat(40);
const valid = {
  repository: { full_name: expected.repository },
  head_repository: { full_name: expected.repository },
  workflow_id: expected.workflowId,
  path: expected.workflowPath,
  name: expected.workflowName,
  event: 'push',
  head_branch: 'main',
  conclusion: 'success',
  head_sha: sha,
};

test('accepts trusted push CI success for exact main SHA', () => {
  assert.deepEqual(validateWorkflowRun(valid, expected, sha), { ok: true, errors: [], sha });
});

test('rejects pull_request events and fork head repository', () => {
  assert.equal(validateWorkflowRun({ ...valid, event: 'pull_request' }, expected, sha).ok, false);
  assert.equal(validateWorkflowRun({ ...valid, head_repository: { full_name: 'fork/repo' } }, expected, sha).ok, false);
});

test('rejects unexpected workflow identity and malformed SHA', () => {
  assert.equal(validateWorkflowRun({ ...valid, workflow_id: 1 }, expected, sha).ok, false);
  assert.equal(validateWorkflowRun({ ...valid, path: '.github/workflows/other.yml' }, expected, sha).ok, false);
  assert.equal(validateWorkflowRun({ ...valid, head_sha: 'abc' }, expected, sha).ok, false);
});

test('rejects stale SHA', () => {
  const result = validateWorkflowRun(valid, expected, 'b'.repeat(40));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('STALE_SHA'));
});
