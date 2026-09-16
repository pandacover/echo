import { useEffect, useRef } from 'react'
import { animate, svg, type JSAnimation } from 'animejs'
import { EYE_SHAPES, eyePath, type EyeShape, type EyeSide } from '~/lib/echo-eyes'

/** Matches the taller quota pill (`h-11` ≈ original height + 50%). */
export const ECHO_ORBIT_CLASS = 'h-11 w-11'

const INTRO_POSES: Array<[EyeShape, EyeShape]> = [
  ['dash', 'dash'],
  ['gt', 'lt'],
  ['lt', 'gt'],
  ['oval', 'dash'],
  ['gt', 'oval'],
  ['lt', 'dash'],
  ['oval', 'oval'],
]

function pickShape(exclude?: EyeShape) {
  const pool = exclude ? EYE_SHAPES.filter((shape) => shape !== exclude) : EYE_SHAPES
  return pool[Math.floor(Math.random() * pool.length)] ?? 'oval'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function EchoFace({ className }: { className?: string }) {
  const leftEye = useRef<SVGPathElement>(null)
  const rightEye = useRef<SVGPathElement>(null)
  const templates = useRef<Partial<Record<`${EyeSide}-${EyeShape}`, SVGPathElement | null>>>({})
  const leftShape = useRef<EyeShape>('oval')
  const rightShape = useRef<EyeShape>('oval')

  useEffect(() => {
    const timers: number[] = []
    const animations: JSAnimation[] = []
    let alive = true
    let poseIndex = 0
    const reduced = prefersReducedMotion()

    const morph = (side: EyeSide, shape: EyeShape) => {
      const el = side === 'left' ? leftEye.current : rightEye.current
      const target = templates.current[`${side}-${shape}`]
      if (!el || !target) return
      const current = side === 'left' ? leftShape : rightShape
      if (current.current === shape) return
      current.current = shape
      el.dataset.shape = shape
      if (reduced) {
        el.setAttribute('d', eyePath(shape, side))
        return
      }
      const animation = animate(el, {
        d: svg.morphTo(target, 0),
        duration: 460,
        ease: 'inOutQuad',
        composition: 'replace',
      })
      animations.push(animation)
    }

    const pose = (left: EyeShape, right: EyeShape) => {
      morph('left', left)
      morph('right', right)
    }

    const schedule = (delay: number, work: () => void) => {
      const id = window.setTimeout(() => {
        if (!alive) return
        work()
      }, delay)
      timers.push(id)
    }

    const loop = () => {
      if (!alive) return
      const next = INTRO_POSES[poseIndex]
      poseIndex += 1
      if (next) {
        pose(next[0], next[1])
        schedule(920, loop)
        return
      }
      const blink = Math.random() < 0.22
      if (blink) {
        pose('dash', 'dash')
        schedule(260, () => {
          pose(pickShape('dash'), pickShape('dash'))
          schedule(1100, loop)
        })
        return
      }
      const left = pickShape(leftShape.current)
      const right = Math.random() < 0.55 ? pickShape(rightShape.current) : left
      pose(left, right)
      schedule(1100 + Math.random() * 900, loop)
    }

    schedule(280, loop)

    return () => {
      alive = false
      for (const id of timers) window.clearTimeout(id)
      for (const animation of animations) {
        animation.revert()
      }
    }
  }, [])

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="50" fill="#111" />
      <path ref={leftEye} data-shape="oval" d={eyePath('oval', 'left')} fill="#fff" />
      <path ref={rightEye} data-shape="oval" d={eyePath('oval', 'right')} fill="#fff" />
      <g opacity="0" pointerEvents="none">
        {EYE_SHAPES.flatMap((shape) =>
          (['left', 'right'] as const).map((side) => (
            <path
              key={`${side}-${shape}`}
              ref={(node) => {
                templates.current[`${side}-${shape}`] = node
              }}
              d={eyePath(shape, side)}
            />
          )),
        )}
      </g>
    </svg>
  )
}

export function EchoMascot() {
  return (
    <div
      aria-label="Echo"
      className={`pointer-events-auto flex ${ECHO_ORBIT_CLASS} shrink-0 items-center justify-center rounded-full bg-nota-terracotta shadow-[0_8px_20px_rgba(196,92,62,0.28)]`}
    >
      <EchoFace className="h-[80%] w-[80%]" />
    </div>
  )
}
