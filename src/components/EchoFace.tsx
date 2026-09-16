import { memo, useLayoutEffect, useRef } from 'react'
import { animate, type JSAnimation } from 'animejs'
import { blinkStrokes, ovalPath, type EyeSide } from '~/lib/echo-eyes'
import { GAZE_HOME, pickGaze, type GazeOffset } from '~/lib/echo-gaze'

/** Matches the taller quota pill (`h-11` ≈ original height + 50%). */
export const ECHO_ORBIT_CLASS = 'h-11 w-11'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function EchoFace({ className }: { className?: string }) {
  const ovals = useRef<Record<EyeSide, SVGPathElement | null>>({ left: null, right: null })
  const blink = useRef<SVGGElement>(null)
  const gaze = useRef<SVGGElement>(null)

  useLayoutEffect(() => {
    const timers: number[] = []
    const animations: JSAnimation[] = []
    let alive = true
    let open = true
    const reduced = prefersReducedMotion()
    const offset: GazeOffset = { ...GAZE_HOME }
    let currentLook: GazeOffset = GAZE_HOME

    const applyGaze = () => {
      gaze.current?.setAttribute('transform', `translate(${offset.x} ${offset.y})`)
    }

    const lookTo = (next: GazeOffset, duration: number) => {
      currentLook = next
      if (!gaze.current) return
      if (reduced || duration === 0) {
        offset.x = next.x
        offset.y = next.y
        applyGaze()
        return
      }
      animations.push(
        animate(offset, {
          x: next.x,
          y: next.y,
          duration,
          ease: 'outQuad',
          composition: 'replace',
          onRender: applyGaze,
        }),
      )
    }

    const setOpen = (next: boolean, duration: number | { oval: number; blink: number }) => {
      if (!alive || open === next) return
      open = next
      const ovalMs = typeof duration === 'number' ? duration : duration.oval
      const blinkMs = typeof duration === 'number' ? duration : duration.blink
      const ovalEls = [ovals.current.left, ovals.current.right].filter(Boolean)
      const blinkEl = blink.current
      if (!ovalEls.length || !blinkEl) return
      if (reduced || ovalMs === 0) {
        for (const el of ovalEls) el?.setAttribute('fill-opacity', next ? '1' : '0')
        blinkEl.setAttribute('opacity', next ? '0' : '1')
        return
      }
      animations.push(
        animate(ovalEls, {
          fillOpacity: next ? 1 : 0,
          duration: ovalMs,
          ease: 'inOutSine',
          composition: 'replace',
        }),
        animate(blinkEl, {
          opacity: next ? 0 : 1,
          duration: blinkMs,
          ease: 'inOutSine',
          composition: 'replace',
        }),
      )
    }

    const schedule = (delay: number, work: () => void) => {
      const id = window.setTimeout(() => {
        if (!alive) return
        work()
      }, delay)
      timers.push(id)
    }

    const closeThenOpen = (then: () => void) => {
      setOpen(false, { oval: 18, blink: 32 })
      schedule(100, () => {
        setOpen(true, { oval: 50, blink: 36 })
        schedule(70, then)
      })
    }

    let first = true
    const loop = () => {
      if (!alive) return
      const wait = first ? 500 + Math.random() * 900 : 1600 + Math.random() * 4200
      first = false
      schedule(wait, () => {
        closeThenOpen(() => {
          if (Math.random() < 0.22) {
            schedule(90, () => closeThenOpen(loop))
            return
          }
          loop()
        })
      })
    }

    loop()

    const lookLoop = () => {
      if (!alive) return
      lookTo(pickGaze(currentLook), 180 + Math.random() * 80)
      schedule(700 + Math.random() * 1600, lookLoop)
    }
    schedule(800 + Math.random() * 700, lookLoop)

    return () => {
      alive = false
      for (const id of timers) window.clearTimeout(id)
      for (const animation of animations) animation.revert()
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
      <g ref={gaze}>
        <path
          ref={(node) => {
            ovals.current.left = node
          }}
          d={ovalPath('left')}
          fill="#fff"
        />
        <path
          ref={(node) => {
            ovals.current.right = node
          }}
          d={ovalPath('right')}
          fill="#fff"
        />
        <g
          ref={blink}
          fill="none"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0"
        >
          {(['left', 'right'] as const).map((side) => {
            const strokes = blinkStrokes(side)
            return (
              <g key={side}>
                <path d={strokes.chevron} />
                <path d={strokes.midline} />
              </g>
            )
          })}
        </g>
      </g>
    </svg>
  )
}

export const EchoMascot = memo(function EchoMascot() {
  return (
    <div
      aria-label="Echo"
      className={`pointer-events-auto box-border flex ${ECHO_ORBIT_CLASS} shrink-0 items-center justify-center rounded-full border border-nota-terracotta p-1`}
    >
      <EchoFace className="h-full w-full" />
    </div>
  )
})
