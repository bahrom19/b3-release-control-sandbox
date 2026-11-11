import { writeFileSync } from 'node:fs';

const SHA_RE = /^[0-9a-f]{40}$/;
const SERVICES = new Set(['backend', 'web', 'image']);
const OUTCOMES = new Set(['success', 'fail', 'timeout']);

function assertSafeEnv(env) {
  for (const name of ['RAILWAY_TOKEN', 'DATABASE_URL', 'PRODUCTION_URL']) {
    if (env[name]) {
      throw new Error(`forbidden environment variable present: ${name}`);
    }
  }
}

export function simulateDeployment({ service, sha, imageTag = null, outcome = 'success', env = {} }) {
  if (!SERVICES.has(service)) throw new Error('unknown service');
  if (!SHA_RE.test(sha)) throw new Error('sha must be 40 lowercase hex characters');
  if (!OUTCOMES.has(outcome)) throw new Error('unknown outcome');
  assertSafeEnv(env);
  if (imageTag && imageTag !== `sha-${sha}`) throw new Error('image tag must equal sha-<sha>');

  const status =
    outcome === 'success' ? 'SUCCEEDED' : outcome === 'fail' ? 'FAILED' : 'TIMEOUT';

  return {
    simulated: true,
    deployed: false,
    service,
    sha,
    image_tag: imageTag,
    status,
    network_calls: 0,
    production_access: false,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const get = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const result = simulateDeployment({
    service: get('service'),
    sha: get('sha'),
    imageTag: get('image-tag') ?? null,
    outcome: get('outcome') ?? 'success',
    env: process.env,
  });
  const out = get('out');
  if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
