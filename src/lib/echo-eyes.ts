export const EYE_SHAPES = ['oval', 'dash', 'gt', 'lt'] as const

export type EyeShape = (typeof EYE_SHAPES)[number]
export type EyeSide = 'left' | 'right'

const POINT_COUNT = 8

function toPath(points: Array<[number, number]>) {
  return `${points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')} Z`
}

function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count = POINT_COUNT,
): Array<[number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]
  })
}

function sampleLoop(vertices: Array<[number, number]>, count = POINT_COUNT): Array<[number, number]> {
  const segments = vertices.map((start, index) => {
    const end = vertices[(index + 1) % vertices.length]
    const length = Math.hypot(end[0] - start[0], end[1] - start[1])
    return { start, end, length }
  })
  const total = segments.reduce((sum, segment) => sum + segment.length, 0)
  const points: Array<[number, number]> = []
  for (let index = 0; index < count; index += 1) {
    let distance = (index / count) * total
    for (const segment of segments) {
      if (distance > segment.length) {
        distance -= segment.length
        continue
      }
      const t = segment.length === 0 ? 0 : distance / segment.length
      points.push([
        segment.start[0] + (segment.end[0] - segment.start[0]) * t,
        segment.start[1] + (segment.end[1] - segment.start[1]) * t,
      ])
      break
    }
  }
  return points
}

export function eyeCenter(side: EyeSide) {
  return { cx: side === 'left' ? 34 : 66, cy: 45 }
}

export function eyePath(shape: EyeShape, side: EyeSide) {
  const { cx, cy } = eyeCenter(side)
  if (shape === 'oval') return toPath(ellipsePoints(cx, cy, 11.2, 16.4))
  if (shape === 'dash') return toPath(ellipsePoints(cx, cy, 13.4, 2.1))
  const rx = 12.2
  const ry = 15.2
  if (shape === 'gt') {
    return toPath(
      sampleLoop([
        [cx + rx, cy],
        [cx - rx, cy - ry],
        [cx - rx, cy + ry],
      ]),
    )
  }
  return toPath(
    sampleLoop([
      [cx - rx, cy],
      [cx + rx, cy - ry],
      [cx + rx, cy + ry],
    ]),
  )
}

export function pathBounds(path: string) {
  const numbers = [...path.matchAll(/-?\d+\.\d+/g)].map((match) => Number(match[0]))
  const xs: number[] = []
  const ys: number[] = []
  for (let index = 0; index < numbers.length; index += 1) {
    if (index % 2 === 0) xs.push(numbers[index] ?? 0)
    else ys.push(numbers[index] ?? 0)
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}
