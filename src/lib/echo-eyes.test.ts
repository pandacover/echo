import assert from 'node:assert/strict'
import test from 'node:test'
import { blinkStrokes, ovalPath, pathBounds, swirlPath, type EyeSide } from './echo-eyes.ts'

const sides: EyeSide[] = ['left', 'right']

test('oval eyes are closed 24-point paths on opposite sides', () => {
  for (const side of sides) {
    const path = ovalPath(side)
    const commands = path.match(/[ML]/g) ?? []
    assert.equal(commands[0], 'M')
    assert.equal(commands.length, 24)
    assert.match(path, /Z$/)
  }
  const leftX = Number(ovalPath('left').match(/M ([\d.]+)/)?.[1])
  const rightX = Number(ovalPath('right').match(/M ([\d.]+)/)?.[1])
  assert.ok(leftX < 50)
  assert.ok(rightX > 50)
})

test('blink chevrons point inward as outlines', () => {
  const left = pathBounds(blinkStrokes('left').chevron)
  const right = pathBounds(blinkStrokes('right').chevron)
  assert.ok(left.maxX < right.minX)
  assert.ok(left.maxX > left.minX)
  assert.ok(right.minX < right.maxX)
})

test('blink crease sits inside each chevron, not between the eyes', () => {
  const left = blinkStrokes('left')
  const right = blinkStrokes('right')
  const leftChevron = pathBounds(left.chevron)
  const rightChevron = pathBounds(right.chevron)
  const leftLine = pathBounds(left.midline)
  const rightLine = pathBounds(right.midline)
  assert.equal(leftLine.minY, leftLine.maxY)
  assert.equal(rightLine.minY, rightLine.maxY)
  assert.ok(leftLine.minX >= leftChevron.minX - 0.01)
  assert.ok(leftLine.maxX <= leftChevron.maxX + 0.01)
  assert.ok(rightLine.minX >= rightChevron.minX - 0.01)
  assert.ok(rightLine.maxX <= rightChevron.maxX + 0.01)
  assert.ok(leftLine.maxX < rightLine.minX)
})

test('swirl eyes are open spirals around the origin', () => {
  const path = swirlPath()
  assert.match(path, /^M /)
  assert.doesNotMatch(path, /Z$/)
  const commands = path.match(/[ML]/g) ?? []
  assert.equal(commands.length, 73)
})
