export const FLICK_RAD_PER_SEC = 8
export const SPIN_DAMPING = 1.45
export const SPIN_REST = 0.18
export const SPIN_MAX = 36
export const MIN_RADIUS_SQ = 16

export function clampSpin(velocity: number) {
  return Math.max(-SPIN_MAX, Math.min(SPIN_MAX, velocity))
}

export function wrapAngleDelta(delta: number) {
  let value = delta
  while (value > Math.PI) value -= Math.PI * 2
  while (value < -Math.PI) value += Math.PI * 2
  return value
}

/** Angle from r0 to r1 around the center, in radians. */
export function angularDelta(
  cx: number,
  cy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const r0x = x0 - cx
  const r0y = y0 - cy
  const r1x = x1 - cx
  const r1y = y1 - cy
  if (r0x * r0x + r0y * r0y < MIN_RADIUS_SQ || r1x * r1x + r1y * r1y < MIN_RADIUS_SQ) return 0
  return wrapAngleDelta(Math.atan2(r1y, r1x) - Math.atan2(r0y, r0x))
}

export function decayVelocity(velocity: number, dt: number, damping = SPIN_DAMPING) {
  if (dt <= 0) return velocity
  const next = velocity * Math.exp(-damping * dt)
  return Math.abs(next) < SPIN_REST ? 0 : next
}

export function isFlick(velocity: number) {
  return Math.abs(velocity) >= FLICK_RAD_PER_SEC
}

export function flickBoost(velocity: number) {
  const sign = velocity < 0 ? -1 : 1
  return sign * Math.max(Math.abs(velocity), 16)
}

export function recoveryBlinkCount(random = Math.random) {
  return 4 + Math.floor(random() * 3)
}
