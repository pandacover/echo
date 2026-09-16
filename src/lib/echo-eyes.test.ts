import assert from 'node:assert/strict'
import test from 'node:test'
import { EYE_SHAPES, eyePath, type EyeSide } from './echo-eyes.ts'

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
