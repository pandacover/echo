import assert from 'node:assert/strict'
import test from 'node:test'
import { EYE_SHAPES, eyePath, pathBounds, type EyeSide } from './echo-eyes.ts'

const sides: EyeSide[] = ['left', 'right']

test('every eye shape is a closed 8-point path', () => {
  for (const shape of EYE_SHAPES) {
    for (const side of sides) {
      const path = eyePath(shape, side)
      const commands = path.match(/[ML]/g) ?? []
      assert.equal(commands[0], 'M')
      assert.equal(commands.length, 8)
      assert.match(path, /Z$/)
    }
  }
})

test('left and right eyes sit on opposite sides of the face', () => {
  const left = eyePath('oval', 'left')
  const right = eyePath('oval', 'right')
  assert.notEqual(left, right)
  const leftX = Number(left.match(/M ([\d.]+)/)?.[1])
  const rightX = Number(right.match(/M ([\d.]+)/)?.[1])
  assert.ok(leftX < 50)
  assert.ok(rightX > 50)
})

test('dash eyes are much flatter than ovals', () => {
  const oval = pathBounds(eyePath('oval', 'left'))
  const dash = pathBounds(eyePath('dash', 'left'))
  assert.ok(dash.maxY - dash.minY < (oval.maxY - oval.minY) * 0.3)
  assert.ok(dash.maxX - dash.minX > oval.maxX - oval.minX)
})

test('gt and lt point in opposite directions', () => {
  const gtStartX = Number(eyePath('gt', 'left').match(/M ([\d.]+)/)?.[1])
  const ltStartX = Number(eyePath('lt', 'left').match(/M ([\d.]+)/)?.[1])
  const oval = pathBounds(eyePath('oval', 'left'))
  const mid = (oval.minX + oval.maxX) / 2
  assert.ok(gtStartX > mid)
  assert.ok(ltStartX < mid)
})
