import { RELEASE_STATUSES } from './ledger.mjs';

export const DEFAULT_APPROVAL_TTL_MS = 60 * 60 * 1000;

export function reconcileExpired(release, now = Date.now(), ttlMs = DEFAULT_APPROVAL_TTL_MS) {
  if (!release) return release;
  if (
    release.status !== RELEASE_STATUSES.PENDING &&
    release.status !== RELEASE_STATUSES.APPROVED
  ) {
    return release;
  }
  const created = Date.parse(release.created_at);
  if (!Number.isFinite(created) || now - created < ttlMs) return release;

  const next = structuredClone(release);
  next.status = RELEASE_STATUSES.FAILED;
  next.failure_reason = 'APPROVAL_TIMEOUT';
  next.updated_at = new Date(now).toISOString();
  return next;
}
