export const RELEASE_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DEPLOYING: 'DEPLOYING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
});

export const SERVICE_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  DEPLOYING: 'DEPLOYING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
});

export const DEFAULT_SERVICES = ['backend', 'web', 'image'];
const clone = (value) => structuredClone(value);

function newAttempt(attemptId, services) {
  return {
    attempt_id: attemptId,
    status: RELEASE_STATUSES.PENDING,
    approved_at: null,
    services: Object.fromEntries(
      services.map((service) => [service, SERVICE_STATUSES.PENDING]),
    ),
  };
}

export function createRelease(sha, attemptId, services = DEFAULT_SERVICES) {
  return {
    release_sha: sha,
    status: RELEASE_STATUSES.PENDING,
    active_attempt_id: attemptId,
    successful_attempt_id: null,
    attempts: { [attemptId]: newAttempt(attemptId, services) },
    last_success: Object.fromEntries(services.map((s) => [s, null])),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function claimRelease(existing, sha, attemptId, services = DEFAULT_SERVICES) {
  if (!existing) {
    return { state: createRelease(sha, attemptId, services), action: 'CREATED' };
  }
  if (existing.status === RELEASE_STATUSES.SUCCEEDED) {
    return { state: existing, action: 'SKIP_SUCCEEDED' };
  }
  if (
    existing.status === RELEASE_STATUSES.PENDING ||
    existing.status === RELEASE_STATUSES.APPROVED ||
    existing.status === RELEASE_STATUSES.DEPLOYING
  ) {
    return { state: existing, action: 'BLOCKED_ACTIVE' };
  }

  const next = clone(existing);
  next.status = RELEASE_STATUSES.PENDING;
  next.active_attempt_id = attemptId;
  next.attempts[attemptId] = newAttempt(attemptId, services);
  next.updated_at = new Date().toISOString();
  return { state: next, action: 'RETRY_ALLOWED' };
}

export function approveAttempt(state, attemptId) {
  if (state.active_attempt_id !== attemptId) return { ok: false, reason: 'STALE_ATTEMPT' };
  const attempt = state.attempts[attemptId];
  if (!attempt || attempt.status !== RELEASE_STATUSES.PENDING) {
    return { ok: false, reason: 'INVALID_STATE' };
  }
  const next = clone(state);
  next.status = RELEASE_STATUSES.APPROVED;
  next.attempts[attemptId].status = RELEASE_STATUSES.APPROVED;
  next.attempts[attemptId].approved_at = new Date().toISOString();
  next.updated_at = new Date().toISOString();
  return { ok: true, state: next };
}

export function beginDeployment(state, attemptId) {
  if (state.active_attempt_id !== attemptId) return { ok: false, reason: 'STALE_ATTEMPT' };
  if (state.status !== RELEASE_STATUSES.APPROVED) {
    return { ok: false, reason: 'INVALID_STATE' };
  }
  const next = clone(state);
  next.status = RELEASE_STATUSES.DEPLOYING;
  next.attempts[attemptId].status = RELEASE_STATUSES.DEPLOYING;
  next.updated_at = new Date().toISOString();
  return { ok: true, state: next };
}

export function recordService(state, attemptId, service, status) {
  const next = clone(state);
  if (next.active_attempt_id !== attemptId) return { ok: false, reason: 'STALE_ATTEMPT' };
  if (!next.attempts[attemptId]?.services[service]) {
    return { ok: false, reason: 'UNKNOWN_SERVICE' };
  }
  if (!Object.values(SERVICE_STATUSES).includes(status)) {
    return { ok: false, reason: 'UNKNOWN_STATUS' };
  }
  next.attempts[attemptId].services[service] = status;
  if (status === SERVICE_STATUSES.SUCCEEDED) {
    next.last_success[service] = next.release_sha;
  }
  next.updated_at = new Date().toISOString();
  return { ok: true, state: next };
}

export function finalizeAttempt(state, attemptId) {
  if (state.active_attempt_id !== attemptId) return { ok: false, reason: 'STALE_ATTEMPT' };
  const statuses = Object.values(state.attempts[attemptId].services);
  const next = clone(state);
  if (statuses.some((s) => s === SERVICE_STATUSES.FAILED)) {
    next.status = RELEASE_STATUSES.FAILED;
    next.attempts[attemptId].status = RELEASE_STATUSES.FAILED;
  } else if (
    statuses.every(
      (s) => s === SERVICE_STATUSES.SUCCEEDED || s === SERVICE_STATUSES.SKIPPED,
    )
  ) {
    next.status = RELEASE_STATUSES.SUCCEEDED;
    next.attempts[attemptId].status = RELEASE_STATUSES.SUCCEEDED;
    next.successful_attempt_id = attemptId;
  } else {
    next.status = RELEASE_STATUSES.DEPLOYING;
    next.attempts[attemptId].status = RELEASE_STATUSES.DEPLOYING;
  }
  next.updated_at = new Date().toISOString();
  return { ok: true, state: next };
}

export function isStale(sha, currentMainSha) {
  return sha !== currentMainSha;
}
