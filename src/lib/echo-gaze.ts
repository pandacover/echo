import { ovalPath, pathBounds, type EyeSide } from './echo-eyes'

export type GazeOffset = { x: number; y: number }

export const GAZE_HOME: GazeOffset = { x: 0, y: 0 }

/** ViewBox-unit saccades. Both eyes move together so Echo looks, not winks. */
export const GAZE_LOOKS: GazeOffset[] = [
  { x: -7, y: 0 },
  { x: 7, y: 0 },
  { x: -6, y: -3 },
  { x: 6, y: -3 },
  { x: 0, y: -5 },
  { x: -5, y: 2 },
  { x: 5, y: 2 },
]

const FACE_CX = 50
const FACE_CY = 50
const FACE_RADIUS = 46

function pointInFace(x: number, y: number) {
  return (x - FACE_CX) ** 2 + (y - FACE_CY) ** 2 <= FACE_RADIUS ** 2
}

export function gazeKeepsEyesOnFace(offset: GazeOffset, sides: EyeSide[] = ['left', 'right']) {
  return sides.every((side) => {
    const bounds = pathBounds(ovalPath(side))
    const corners: Array<[number, number]> = [
      [bounds.minX + offset.x, bounds.minY + offset.y],
      [bounds.maxX + offset.x, bounds.minY + offset.y],
      [bounds.minX + offset.x, bounds.maxY + offset.y],
      [bounds.maxX + offset.x, bounds.maxY + offset.y],
    ]
    return corners.every(([x, y]) => pointInFace(x, y))
  })
}

export function pickGaze(current: GazeOffset): GazeOffset {
  if (current.x !== 0 || current.y !== 0) {
    if (Math.random() < 0.42) return GAZE_HOME
  }
  const pool = GAZE_LOOKS.filter((look) => look.x !== current.x || look.y !== current.y)
  return pool[Math.floor(Math.random() * pool.length)] ?? GAZE_HOME
}
