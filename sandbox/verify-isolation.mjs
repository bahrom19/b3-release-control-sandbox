import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const SKIP = new Set(['.git', 'node_modules', 'out']);
const ALLOWED_HTTP = new Set(['example.invalid', 'localhost', '127.0.0.1']);
const FORBIDDEN = [
  /railway\.app/i,
  /railway up/i,
  /ghcr\.io/i,
  /production-url/i,
  /customer/i,
  /tenant/i,
  /private[-_ ]key/i,
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const errors = [];
for (const path of walk(ROOT)) {
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extname(path))) continue;
  if (path.endsWith('verify-isolation.mjs')) continue;
  const text = readFileSync(path, 'utf8');
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) errors.push(`${path}: forbidden pattern ${pattern}`);
  }
  for (const match of text.matchAll(/https?:\/\/([^/\s"'`]+)/g)) {
    const host = match[1].toLowerCase();
    if (!ALLOWED_HTTP.has(host)) errors.push(`${path}: external URL host ${host}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('isolation scan: OK');
