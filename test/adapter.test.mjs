import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulateDeployment } from '../sandbox/dummy-deploy.mjs';

const sha = 'a'.repeat(40);

test('simulation is explicit and never deploys', () => {
  const result = simulateDeployment({ service: 'backend', sha, env: {} });
  assert.equal(result.simulated, true);
  assert.equal(result.deployed, false);
  assert.equal(result.network_calls, 0);
  assert.equal(result.production_access, false);
});

test('forbidden environment presence fails without printing values', () => {
  assert.throws(
    () => simulateDeployment({ service: 'backend', sha, env: { RAILWAY_TOKEN: 'present' } }),
    /forbidden environment variable present/,
  );
});

test('adapter source has no network imports', () => {
  const source = readFileSync(new URL('../sandbox/dummy-deploy.mjs', import.meta.url), 'utf8');
  assert.equal(/from ['"]node:(http|https|net)['"]/.test(source), false);
  assert.equal(/fetch\(/.test(source), false);
});
