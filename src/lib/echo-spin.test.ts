import assert from 'node:assert/strict'
import test from 'node:test'
import {
  angularDelta,
  decayVelocity,
  flickBoost,
  isFlick,
  recoveryBlinkCount,
  wrapAngleDelta,
} from './echo-spin.ts'

test('angularDelta follows a clockwise quarter-turn around the center', () => {
  const delta = angularDelta(0, 0, 10, 0, 0, 10)
  assert.ok(delta > 1.5 && delta < 1.7)
})

test('angularDelta is zero when the pointer is on the center', () => {
  assert.equal(angularDelta(5, 5, 5, 5, 8, 5), 0)
})

test('wrapAngleDelta keeps deltas in -pi..pi', () => {
  assert.ok(Math.abs(wrapAngleDelta(Math.PI * 2 - 0.1) + 0.1) < 1e-9)
})

test('decayVelocity eases to rest', () => {
  let velocity = 12
  for (let i = 0; i < 80; i += 1) velocity = decayVelocity(velocity, 0.05)
  assert.equal(velocity, 0)
})

test('flicks start at 8 rad/s and boost to at least 16', () => {
  assert.equal(isFlick(8), true)
  assert.equal(isFlick(7.9), false)
  assert.equal(flickBoost(9), 16)
  assert.equal(flickBoost(-20), -20)
})

test('recovery blinks are 4, 5, or 6', () => {
  assert.equal(recoveryBlinkCount(() => 0), 4)
  assert.equal(recoveryBlinkCount(() => 0.5), 5)
  assert.equal(recoveryBlinkCount(() => 0.99), 6)
})
