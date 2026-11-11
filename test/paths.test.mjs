import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges, loadPathRules } from '../.github/release/classify-paths.mjs';

const rules = loadPathRules();
const bases = { backend: 'a', web: 'a', image: 'a' };

test('backend source triggers backend and image; backend config triggers backend only', () => {
  assert.deepEqual(classifyChanges({ files: [{ path: 'services/backend/src/main.ts' }], bases, rules }), {
    backend: true, web: false, image: true,
  });
  assert.deepEqual(classifyChanges({ files: [{ path: 'services/backend/config.json' }], bases, rules }), {
    backend: true, web: false, image: false,
  });
});

test('web changes trigger only web', () => {
  assert.deepEqual(classifyChanges({ files: [{ path: 'services/web/deploy.yml' }], bases, rules }), {
    backend: false, web: true, image: false,
  });
});

test('shared or unknown paths fail safe to all services', () => {
  assert.deepEqual(classifyChanges({ files: [{ path: 'shared/release/config.json' }], bases, rules }), {
    backend: true, web: true, image: true,
  });
  assert.deepEqual(classifyChanges({ files: [{ path: 'unknown/file.txt' }], bases, rules }), {
    backend: true, web: true, image: true,
  });
});

test('missing base, rename, and delete fail safe', () => {
  assert.deepEqual(classifyChanges({ files: [], bases: { backend: 'a' }, rules }), {
    backend: true, web: true, image: true,
  });
  assert.deepEqual(classifyChanges({ files: [{ path: 'services/web/new', previous_path: 'services/backend/old' }], bases, rules }), {
    backend: true, web: true, image: true,
  });
});
