import { execFileSync } from 'node:child_process';

const sha = process.env.RELEASE_SHA;
if (!/^[0-9a-f]{40}$/.test(sha ?? '')) {
  console.error('missing or malformed RELEASE_SHA');
  process.exit(1);
}

execFileSync('git', ['fetch', 'origin', 'main'], { stdio: 'ignore' });
const currentMain = execFileSync('git', ['rev-parse', 'origin/main'], {
  encoding: 'utf8',
}).trim();

if (sha !== currentMain) {
  console.error(`STALE_SHA: released ${sha}, current main ${currentMain}`);
  process.exit(1);
}
console.log(`postcheck ok for ${sha}`);
