import { useEffect, useId, useRef } from 'react'
import { animate, svg, type JSAnimation } from 'animejs'
import { EYE_SHAPES, eyePath, type EyeShape, type EyeSide } from '~/lib/echo-eyes'

function pickShape(exclude?: EyeShape) {
  const pool = exclude ? EYE_SHAPES.filter((shape) => shape !== exclude) : EYE_SHAPES
  return pool[Math.floor(Math.random() * pool.length)] ?? 'oval'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function EchoFace({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  const leftEye = useRef<SVGPathElement>(null)
  const rightEye = useRef<SVGPathElement>(null)
  const leftShape = useRef<EyeShape>('oval')
  const rightShape = useRef<EyeShape>('oval')

  useEffect(() => {
    if (prefersReducedMotion()) return

    const timers: number[] = []
    const animations: JSAnimation[] = []
    let alive = true

    const template = (side: EyeSide, shape: EyeShape) =>
      document.getElementById(`echo-eye-${uid}-${side}-${shape}`)

    const morph = (side: EyeSide, shape: EyeShape) => {
      const el = side === 'left' ? leftEye.current : rightEye.current
      const target = template(side, shape)
      if (!el || !target) return
      const current = side === 'left' ? leftShape : rightShape
      if (current.current === shape) return
      current.current = shape
      const animation = animate(el, {
        d: svg.morphTo(target),
        duration: 380,
        ease: 'inOutQuad',
      })
      animations.push(animation)
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
      const wait = 900 + Math.random() * 2200
      schedule(wait, () => {
        const blink = Math.random() < 0.28
        if (blink) {
          morph('left', 'dash')
          morph('right', 'dash')
          schedule(220, () => {
            morph('left', pickShape('dash'))
            morph('right', pickShape('dash'))
            loop()
          })
          return
        }
        morph('left', pickShape(leftShape.current))
        if (Math.random() < 0.65) {
          morph('right', pickShape(rightShape.current))
        } else {
          morph('right', leftShape.current)
        }
        loop()
      })
    }

    loop()

    return () => {
      alive = false
      for (const id of timers) window.clearTimeout(id)
      for (const animation of animations) {
        animation.revert()
      }
    }
  }, [uid])

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="50" fill="#111" />
      <path ref={leftEye} d={eyePath('oval', 'left')} fill="#fff" />
      <path ref={rightEye} d={eyePath('oval', 'right')} fill="#fff" />
      <g opacity="0" pointerEvents="none">
        {EYE_SHAPES.flatMap((shape) =>
          (['left', 'right'] as const).map((side) => (
            <path
              key={`${side}-${shape}`}
              id={`echo-eye-${uid}-${side}-${shape}`}
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
      className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nota-terracotta shadow-[0_8px_20px_rgba(196,92,62,0.28)]"
    >
      <EchoFace className="h-[82%] w-[82%]" />
    </div>
  )
}
