import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EDGE_INSET,
  INSTALL_STEPS,
  boxCenter,
  clamp,
  containedImageRect,
  demoFrameRect,
  echoRestPosition,
  hotspotCornerRadius,
  hotspotRect,
  installStep,
  isLastInstallStep,
  isTap,
  nextInstallIndex,
  pleaseClick,
  pointerTravel,
} from './echo-install.ts'

test('the walkthrough is four steps and each ends with Please click ‘action’', () => {
  assert.equal(INSTALL_STEPS.length, 4)
  for (const step of INSTALL_STEPS) {
    assert.equal(step.story.at(-1), pleaseClick(step.action))
    assert.ok(step.story.length >= 2)
    const body = step.story.slice(0, -1).join(' ')
    assert.equal(body.includes('—'), false)
    assert.equal(body.includes(':'), false)
    assert.ok(body.length > 20)
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

test('wide hotspots get a rounded-rect highlight instead of a circle', () => {
  assert.equal(hotspotCornerRadius({ x: 0, y: 0, w: 80, h: 20 }), 10)
  assert.equal(hotspotCornerRadius({ x: 0, y: 0, w: 20, h: 20 }), 10)
})

test('Echo sits near the action and stays off the frame edge', () => {
  for (const step of INSTALL_STEPS) {
    const frame = demoFrameRect(390, 844, step.imageWidth, step.imageHeight)
    const stageW = frame.w
    const stageH = frame.h - 56
    const image = containedImageRect(stageW, stageH, step.imageWidth, step.imageHeight)
    const hot = hotspotRect(image, step.hotspot)
    const rest = echoRestPosition(hot, stageW, stageH, step.bias)
    const half = 18
    assert.ok(rest.x - half >= EDGE_INSET - 0.5, `${step.id} x ${rest.x}`)
    assert.ok(rest.y - half >= EDGE_INSET - 0.5, `${step.id} y ${rest.y}`)
    assert.ok(rest.x + half <= stageW - EDGE_INSET + 0.5, `${step.id} right ${rest.x}`)
    assert.ok(rest.y + half <= stageH - EDGE_INSET + 0.5, `${step.id} bottom ${rest.y}`)
    const center = boxCenter(hot)
    const dist = Math.hypot(rest.x - center.x, rest.y - center.y)
    assert.ok(dist < 140, `${step.id} too far from action (${dist})`)
  }
})

test('clamp keeps values in range', () => {
  assert.equal(clamp(5, 0, 10), 5)
  assert.equal(clamp(-1, 0, 10), 0)
  assert.equal(clamp(99, 0, 10), 10)
})

test('the demo frame stays inside the viewport', () => {
  const frame = demoFrameRect(390, 844)
  assert.ok(frame.w <= 360)
  assert.ok(frame.x >= 0)
  assert.ok(frame.y >= 10)
  assert.ok(frame.x + frame.w <= 390)
  assert.ok(frame.y + frame.h <= 844)
})

test('wide screenshots get a shorter frame instead of empty letterbox', () => {
  const tall = demoFrameRect(390, 844, 1206, 2436)
  const wide = demoFrameRect(390, 844, 1206, 863)
  assert.ok(wide.h < tall.h)
  assert.ok(wide.h < 400)
})

test('a shorter frame keeps the same bottom as the tall one', () => {
  const tall = demoFrameRect(390, 844, 1206, 2436)
  const wide = demoFrameRect(390, 844, 1206, 863, tall.y + tall.h)
  assert.ok(Math.abs(wide.y + wide.h - (tall.y + tall.h)) < 1)
  assert.ok(wide.y > tall.y)
})
