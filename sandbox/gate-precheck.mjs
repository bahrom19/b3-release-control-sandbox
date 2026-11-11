import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateWorkflowRun } from '../.github/release/workflow-trust.mjs';
import { classifyChanges, loadPathRules, parseNameStatus } from '../.github/release/classify-paths.mjs';

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error('missing GITHUB_EVENT_PATH');
  process.exit(1);
}

const payload = JSON.parse(readFileSync(eventPath, 'utf8'));
const run = payload.workflow_run;
const currentMain = execFileSync('git', ['rev-parse', 'origin/main'], {
  encoding: 'utf8',
}).trim();

const result = validateWorkflowRun(
  run,
  {
    repository: process.env.GITHUB_REPOSITORY,
    workflowId: process.env.CI_WORKFLOW_ID,
    workflowPath: process.env.CI_WORKFLOW_PATH,
    workflowName: process.env.CI_WORKFLOW_NAME,
  },
  currentMain,
);

if (!result.ok) {
  console.error(`release gate precheck failed: ${result.errors.join(', ')}`);
  process.exit(1);
}

execFileSync('git', ['fetch', 'origin', result.sha], { stdio: 'ignore' });
const diff = execFileSync(
  'git',
  ['diff-tree', '--no-commit-id', '--name-status', '-r', '--root', result.sha],
  { encoding: 'utf8' },
);
const services = classifyChanges({
  files: parseNameStatus(diff),
  bases: { backend: true, web: true, image: true },
  rules: loadPathRules(),
});

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `sha=${result.sha}\n`);
  for (const service of ['backend', 'web', 'image']) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${service}=${services[service]}\n`);
  }
}
console.log(`precheck ok for ${result.sha}`);
