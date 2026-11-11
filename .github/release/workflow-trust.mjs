const SHA_RE = /^[0-9a-f]{40}$/;

export function validateWorkflowRun(run, expected, currentMainSha) {
  const errors = [];

  if (!run || typeof run !== 'object') {
    return { ok: false, errors: ['missing workflow_run payload'], sha: null };
  }

  const repo = run.repository?.full_name;
  const headRepo = run.head_repository?.full_name;
  const sha = run.head_sha;

  if (repo !== expected.repository) errors.push('repository mismatch');
  if (headRepo !== expected.repository) errors.push('head_repository mismatch');
  if (String(run.workflow_id) !== String(expected.workflowId)) {
    errors.push('workflow_id mismatch');
  }
  if (run.path !== expected.workflowPath) errors.push('workflow path mismatch');
  if (run.name !== expected.workflowName) errors.push('workflow name mismatch');
  if (run.event !== 'push') errors.push('event is not push');
  if (run.head_branch !== 'main') errors.push('head_branch is not main');
  if (run.conclusion !== 'success') errors.push('conclusion is not success');
  if (typeof sha !== 'string' || !SHA_RE.test(sha)) {
    errors.push('head_sha is not a canonical 40-char SHA');
  }
  if (currentMainSha && sha !== currentMainSha) errors.push('STALE_SHA');

  return { ok: errors.length === 0, errors, sha: sha ?? null };
}
