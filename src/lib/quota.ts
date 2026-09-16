export const DEFAULT_QUOTA_SECONDS = 600

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

export function formatRemainingTime(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '0 min left'
  if (remainingSeconds < 60) return `${remainingSeconds}s left`
  const minutes = remainingSeconds / 60
  const label = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)
  return `${label} min left`
}
