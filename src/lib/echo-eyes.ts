export const EYE_SHAPES = ['oval', 'blink'] as const

export type EyeShape = (typeof EYE_SHAPES)[number]
export type EyeSide = 'left' | 'right'

const OVAL_POINTS = 24

function toClosedPath(points: Array<[number, number]>) {
  return `${points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')} Z`
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, count = OVAL_POINTS) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)] as [number, number]
  })
}

export function eyeCenter(side: EyeSide) {
  return { cx: side === 'left' ? 34 : 66, cy: 45 }
}

export function ovalPath(side: EyeSide) {
  const { cx, cy } = eyeCenter(side)
  return toClosedPath(ellipsePoints(cx, cy, 11.2, 16.4))
}

/** Inward `>` / `<` plus a crease through the middle of each chevron — not a line between the eyes. */
export function blinkStrokes(side: EyeSide) {
  const { cx, cy } = eyeCenter(side)
  const rx = 10.5
  const ry = 13
  const left = (cx - rx).toFixed(2)
  const right = (cx + rx).toFixed(2)
  const top = (cy - ry).toFixed(2)
  const bottom = (cy + ry).toFixed(2)
  const midY = cy.toFixed(2)
  if (side === 'left') {
    return {
      chevron: `M ${left} ${top} L ${right} ${midY} L ${left} ${bottom}`,
      midline: `M ${left} ${midY} L ${right} ${midY}`,
    }
  }
  return {
    chevron: `M ${right} ${top} L ${left} ${midY} L ${right} ${bottom}`,
    midline: `M ${right} ${midY} L ${left} ${midY}`,
  }
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
