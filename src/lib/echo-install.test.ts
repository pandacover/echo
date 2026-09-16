import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INSTALL_STEPS,
  bubbleSide,
  containedImageRect,
  demoFrameRect,
  hotspotCornerRadius,
  hotspotRect,
  installStep,
  isLastInstallStep,
  isTap,
  nextInstallIndex,
  orbitPoint,
  orbitRadii,
  pleaseClick,
  pointerTravel,
} from './echo-install.ts'

test('the walkthrough is four steps and each ends with Please click ‘action’', () => {
  assert.equal(INSTALL_STEPS.length, 4)
  for (const step of INSTALL_STEPS) {
    assert.equal(step.story.at(-1), pleaseClick(step.action))
    assert.ok(step.story.length >= 2)
    assert.match(step.story[0] ?? '', /experiment/i)
  }
  assert.deepEqual(
    INSTALL_STEPS.map((step) => step.action),
    ['More', 'View More', 'Add to Home Screen', 'Add'],
  )
})

test('pleaseClick wraps the control name in the requested quotes', () => {
  assert.equal(pleaseClick('Add'), 'Please click ‘Add’')
})

test('a tap is a short pointer travel; a drag is not', () => {
  assert.equal(isTap(0), true)
  assert.equal(isTap(7.9), true)
  assert.equal(isTap(8), false)
  assert.ok(pointerTravel(0, 0, 3, 4) === 5)
})

test('nextInstallIndex ends on the last step', () => {
  assert.equal(nextInstallIndex(0), 1)
  assert.equal(nextInstallIndex(3), null)
  assert.equal(isLastInstallStep(3), true)
  assert.equal(installStep(-1).id, 'more')
  assert.equal(installStep(99).id, 'add')
})

test('containedImageRect letterboxes a tall image in a wide box', () => {
  const box = containedImageRect(200, 100, 50, 100)
  assert.equal(box.h, 100)
  assert.equal(box.w, 50)
  assert.equal(box.x, 75)
  assert.equal(box.y, 0)
})

test('containedImageRect pillarboxes a wide image in a tall box', () => {
  const box = containedImageRect(100, 200, 100, 50)
  assert.equal(box.w, 100)
  assert.equal(box.h, 50)
  assert.equal(box.x, 0)
  assert.equal(box.y, 75)
})

test('hotspotRect maps fractions onto the contained image', () => {
  const image = { x: 10, y: 20, w: 100, h: 200 }
  const box = hotspotRect(image, { x: 0.1, y: 0.2, w: 0.5, h: 0.25 })
  assert.deepEqual(box, { x: 20, y: 60, w: 50, h: 50 })
})

test('orbitPoint traces an ellipse around the hotspot', () => {
  const start = orbitPoint(10, 10, 8, 4, 0)
  const down = orbitPoint(10, 10, 8, 4, Math.PI / 2)
  assert.equal(start.x, 18)
  assert.equal(start.y, 10)
  assert.ok(Math.abs(down.x - 10) < 1e-9)
  assert.equal(down.y, 14)
  const radii = orbitRadii({ x: 0, y: 0, w: 20, h: 10 }, 8, 2)
  assert.equal(radii.rx, 16)
  assert.equal(radii.ry, 11)
})

test('wide hotspots get a rounded-rect highlight instead of a circle', () => {
  assert.equal(hotspotCornerRadius({ x: 0, y: 0, w: 80, h: 20 }), 10)
  assert.equal(hotspotCornerRadius({ x: 0, y: 0, w: 20, h: 20 }), 10)
})

test('the speech bubble prefers the roomiest side of the stage', () => {
  assert.equal(bubbleSide(180, 80, 200, 200), 'left')
  assert.equal(bubbleSide(20, 80, 200, 200), 'right')
  assert.equal(bubbleSide(100, 20, 200, 200), 'bottom')
  assert.equal(bubbleSide(100, 180, 200, 200), 'top')
})

test('the demo frame stays inside the viewport', () => {
  const frame = demoFrameRect(390, 844)
  assert.ok(frame.w <= 360)
  assert.ok(frame.x >= 0)
  assert.ok(frame.y >= 10)
  assert.ok(frame.x + frame.w <= 390)
  assert.ok(frame.y + frame.h <= 844)
})
