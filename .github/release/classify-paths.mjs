import { readFileSync } from 'node:fs';

export const SERVICES = ['backend', 'web', 'image'];

export function loadPathRules(url = new URL('./paths.json', import.meta.url)) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

export function classifyChanges({ files, bases, rules }) {
  const all = Object.fromEntries(SERVICES.map((s) => [s, true]));
  const none = Object.fromEntries(SERVICES.map((s) => [s, false]));

  if (!Array.isArray(files)) return all;
  if (!bases || SERVICES.some((s) => !bases[s])) return all;
  if (files.length === 0) return none;

  const changed = new Set();
  const known = new Set(Object.values(rules).flat());

  for (const file of files) {
    const paths = [file.path, file.previous_path ?? file.previousPath].filter(
      Boolean,
    );
    if (paths.length === 0) return all;
    if (
      file.previous_path ||
      file.previousPath ||
      file.status === 'renamed' ||
      file.status === 'deleted'
    ) {
      return all;
    }

    for (const path of paths) {
      if (path.startsWith('shared/')) return all;

      const matched = [...known].filter(
        (prefix) => path === prefix || path.startsWith(prefix),
      );
      if (matched.length === 0) return all;

      for (const service of SERVICES) {
        if ((rules[service] ?? []).some((prefix) => path.startsWith(prefix))) {
          changed.add(service);
        }
      }
    }
  }

  return Object.fromEntries(SERVICES.map((s) => [s, changed.has(s)]));
}

export function parseNameStatus(text) {
  const files = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0];
    if (status.startsWith('R') || status.startsWith('C')) {
      files.push({ status: 'renamed', previous_path: parts[1], path: parts[2] });
    } else if (status === 'D') {
      files.push({ status: 'deleted', path: parts[1] });
    } else {
      files.push({ status: 'modified', path: parts[1] });
    }
  }
  return files;
}
