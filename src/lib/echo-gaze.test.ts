import assert from 'node:assert/strict'
import test from 'node:test'
import { ovalPath, pathBounds, type EyeSide } from './echo-eyes.ts'
import { GAZE_HOME, GAZE_LOOKS, offsetKeepsBoundsOnFace, pickGaze } from './echo-gaze.ts'

test('every look keeps both oval eyes inside the face', () => {
  const sides: EyeSide[] = ['left', 'right']
  const bounds = sides.map((side) => pathBounds(ovalPath(side)))
  assert.equal(bounds.every((box) => offsetKeepsBoundsOnFace(box, GAZE_HOME)), true)
  for (const look of GAZE_LOOKS) {
    assert.equal(
      bounds.every((box) => offsetKeepsBoundsOnFace(box, look)),
      true,
      `${look.x},${look.y}`,
    )
  }
})

test('pickGaze often returns home after a look, never the same look twice', () => {
  const samples = Array.from({ length: 200 }, () => pickGaze({ x: 7, y: 0 }))
  const homes = samples.filter((look) => look.x === 0 && look.y === 0)
  assert.ok(homes.length > 40)
  assert.ok(samples.every((look) => look.x !== 7 || look.y !== 0))
})
