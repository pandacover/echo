export const DEFAULT_QUOTA_SECONDS = 600

/** Below 64kbps so file-size estimates run a bit long and under-reporting is harder. */
export const ESTIMATE_BYTES_PER_SECOND = 6000

/** Honest timer/container slack. Larger gaps are treated as a quota bypass. */
export const QUOTA_OVERAGE_SLACK_SECONDS = 15

export const QUOTA_REACHED = "You've used all of your recording time."
export const QUOTA_EXCEEDED = 'This recording is longer than your remaining time.'
export const QUOTA_STOPPED =
  'Recording stopped — you used the rest of your recording time.'
export const QUOTA_TOO_SHORT_AT_CAP =
  'Recording stopped at your time limit, but it was too short to save.'
export const QUOTA_LOOKUP_FAILED =
  'Could not check your remaining recording time. Try again in a moment.'

export type RecordingQuota = {
  quotaSeconds: number
  usedSeconds: number
  remainingSeconds: number
}

export function toRecordingQuota(row: {
  quota_seconds: number
  used_seconds: number
}): RecordingQuota {
  return {
    quotaSeconds: row.quota_seconds,
    usedSeconds: row.used_seconds,
    remainingSeconds: Math.max(0, row.quota_seconds - row.used_seconds),
  }
}

export function resolveDisplayedRemaining(
  quota: RecordingQuota | null | undefined,
  session: { userId?: string | null; isSignedIn?: boolean | null } | string | null | undefined,
): number | null {
  if (quota) return quota.remainingSeconds
  const signedIn =
    typeof session === 'object' && session != null
      ? Boolean(session.userId || session.isSignedIn)
      : Boolean(session)
  if (signedIn) return null
  return DEFAULT_QUOTA_SECONDS
}

export function parseClaimedDuration(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

export function estimateAudioSeconds(byteLength: number): number {
  if (!Number.isFinite(byteLength) || byteLength <= 0) return 1
  return Math.max(1, Math.round(byteLength / ESTIMATE_BYTES_PER_SECOND))
}

export function measuredDurationSeconds(claimed: number, estimated: number): number {
  return Math.max(1, claimed, estimated)
}

export function billedDurationSeconds(measured: number, remaining: number): number {
  if (remaining <= 0) return 0
  return Math.min(Math.max(1, measured), remaining)
}

export function shouldRejectBeforeTranscribe(
  measured: number,
  remaining: number,
): boolean {
  if (remaining <= 0) return true
  return measured > remaining + QUOTA_OVERAGE_SLACK_SECONDS
}

export function shouldStopForQuota(
  elapsedSeconds: number,
  remainingSeconds: number | null | undefined,
): boolean {
  if (remainingSeconds == null) return false
  return elapsedSeconds >= remainingSeconds
}

export function liveRemainingSeconds(
  remainingSeconds: number | null | undefined,
  elapsedSeconds: number,
): number | null {
  if (remainingSeconds == null) return null
  return Math.max(0, remainingSeconds - Math.max(0, elapsedSeconds))
}

export function formatRemainingTime(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '0 min left'
  if (remainingSeconds < 60) return `${remainingSeconds}s left`
  const minutes = remainingSeconds / 60
  const label = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)
  return `${label} min left`
}
