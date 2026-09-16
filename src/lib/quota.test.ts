import assert from 'node:assert/strict'
import test from 'node:test'
import {
  billedDurationSeconds,
  estimateAudioSeconds,
  ESTIMATE_BYTES_PER_SECOND,
  liveRemainingSeconds,
  measuredDurationSeconds,
  parseClaimedDuration,
  QUOTA_OVERAGE_SLACK_SECONDS,
  resolveDisplayedRemaining,
  shouldRejectBeforeTranscribe,
  shouldStopForQuota,
  toRecordingQuota,
} from './quota.ts'

test('toRecordingQuota never goes negative', () => {
  assert.equal(toRecordingQuota({ quota_seconds: 600, used_seconds: 800 }).remainingSeconds, 0)
})

test('resolveDisplayedRemaining uses profile, else the free default when signed out', () => {
  assert.equal(
    resolveDisplayedRemaining({ quotaSeconds: 600, usedSeconds: 60, remainingSeconds: 540 }, 'user_1'),
    540,
  )
  assert.equal(resolveDisplayedRemaining(null, null), 600)
  assert.equal(resolveDisplayedRemaining(null, 'user_1'), null)
  assert.equal(resolveDisplayedRemaining(null, { isSignedIn: true }), null)
  assert.equal(resolveDisplayedRemaining(null, { userId: null, isSignedIn: false }), 600)
})

test('parseClaimedDuration rejects tampered values', () => {
  assert.equal(parseClaimedDuration('1'), 1)
  assert.equal(parseClaimedDuration(''), 0)
  assert.equal(parseClaimedDuration('abc'), 0)
  assert.equal(parseClaimedDuration(-12), 0)
  assert.equal(parseClaimedDuration(Number.NaN), 0)
  assert.equal(parseClaimedDuration(9.6), 10)
})

test('measured duration prefers the larger of claimed and estimated', () => {
  assert.equal(measuredDurationSeconds(1, estimateAudioSeconds(6000 * 120)), 120)
  assert.equal(measuredDurationSeconds(30, 8), 30)
})

test('billed duration is capped at remaining and never exceeds quota', () => {
  assert.equal(billedDurationSeconds(40, 10), 10)
  assert.equal(billedDurationSeconds(4, 10), 4)
  assert.equal(billedDurationSeconds(8, 0), 0)
})

test('reject only when measured is well past remaining', () => {
  assert.equal(shouldRejectBeforeTranscribe(10, 0), true)
  assert.equal(shouldRejectBeforeTranscribe(10, 10), false)
  assert.equal(
    shouldRejectBeforeTranscribe(10 + QUOTA_OVERAGE_SLACK_SECONDS, 10),
    false,
  )
  assert.equal(
    shouldRejectBeforeTranscribe(11 + QUOTA_OVERAGE_SLACK_SECONDS, 10),
    true,
  )
})

test('auto-stop when remaining is 0 or elapsed reaches remaining', () => {
  assert.equal(shouldStopForQuota(0, 0), true)
  assert.equal(shouldStopForQuota(5, 0), true)
  assert.equal(shouldStopForQuota(9, 10), false)
  assert.equal(shouldStopForQuota(10, 10), true)
  assert.equal(shouldStopForQuota(3, null), false)
})

test('live remaining counts down and floors at 0', () => {
  assert.equal(liveRemainingSeconds(30, 12), 18)
  assert.equal(liveRemainingSeconds(5, 9), 0)
  assert.equal(liveRemainingSeconds(null, 4), null)
})

test('estimateAudioSeconds uses the conservative bytes/sec constant', () => {
  assert.equal(estimateAudioSeconds(ESTIMATE_BYTES_PER_SECOND * 8), 8)
  assert.equal(estimateAudioSeconds(0), 1)
})
