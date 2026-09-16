import assert from 'node:assert/strict'
import test from 'node:test'
import { GAZE_HOME, GAZE_LOOKS, gazeKeepsEyesOnFace, pickGaze } from './echo-gaze.ts'

test('every look keeps both oval eyes inside the face', () => {
  assert.equal(gazeKeepsEyesOnFace(GAZE_HOME), true)
  for (const look of GAZE_LOOKS) {
    assert.equal(gazeKeepsEyesOnFace(look), true, `${look.x},${look.y}`)
  }
})

test('pickGaze often returns home after a look, never the same look twice', () => {
  const samples = Array.from({ length: 200 }, () => pickGaze({ x: 7, y: 0 }))
  const homes = samples.filter((look) => look.x === 0 && look.y === 0)
  assert.ok(homes.length > 40)
  assert.ok(samples.every((look) => look.x !== 7 || look.y !== 0))
})
