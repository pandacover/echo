import { memo, useLayoutEffect, useRef } from 'react'
import { animate, type JSAnimation } from 'animejs'
import { blinkStrokes, ovalPath, swirlPath, type EyeSide } from '~/lib/echo-eyes'
import { GAZE_HOME, pickGaze, type GazeOffset } from '~/lib/echo-gaze'
import {
  angularDelta,
  clampSpin,
  decayVelocity,
  flickBoost,
  isFlick,
  recoveryBlinkCount,
  SPIN_REST,
} from '~/lib/echo-spin'

/** Matches the taller quota pill (`h-11` ≈ original height + 50%). */
export const ECHO_ORBIT_CLASS = 'h-11 w-11'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const EchoMascot = memo(function EchoMascot() {
  const root = useRef<HTMLDivElement>(null)
  const rotator = useRef<HTMLDivElement>(null)
  const ovals = useRef<Record<EyeSide, SVGPathElement | null>>({ left: null, right: null })
  const blink = useRef<SVGGElement>(null)
  const restEyes = useRef<SVGGElement>(null)
  const gaze = useRef<SVGGElement>(null)
  const swirls = useRef<SVGGElement>(null)
  const swirlSpin = useRef<Record<EyeSide, SVGGElement | null>>({ left: null, right: null })

  useLayoutEffect(() => {
    const timers: number[] = []
    const animations: JSAnimation[] = []
    let alive = true
    let open = true
    let dragging = false
    let dizzy = false
    let recovering = false
    let pointerId: number | null = null
    let lastX = 0
    let lastY = 0
    let lastT = 0
    let rotation = 0
    let velocity = 0
    let swirlAngle = 0
    let raf = 0
    let lastFrame = performance.now()
    const reduced = prefersReducedMotion()
    const offset: GazeOffset = { ...GAZE_HOME }
    let currentLook: GazeOffset = GAZE_HOME

    const busy = () => dragging || dizzy || recovering || Math.abs(velocity) > SPIN_REST

    const applyGaze = () => {
      gaze.current?.setAttribute('transform', `translate(${offset.x} ${offset.y})`)
    }

    const applySpin = () => {
      rotator.current?.style.setProperty('transform', `rotate(${rotation}rad)`)
      const left = swirlSpin.current.left
      const right = swirlSpin.current.right
      if (left) left.setAttribute('transform', `translate(34 45) rotate(${swirlAngle * (180 / Math.PI)})`)
      if (right) right.setAttribute('transform', `translate(66 45) rotate(${-swirlAngle * (180 / Math.PI)})`)
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
      if (dizzy && !recovering) return
      const ovalMs = typeof duration === 'number' ? duration : duration.oval
      const blinkMs = typeof duration === 'number' ? duration : duration.blink
      const ovalEls = [ovals.current.left, ovals.current.right].filter(Boolean)
      const blinkEl = blink.current
      if (!ovalEls.length || !blinkEl) return
      open = next
      if (reduced || ovalMs === 0) {
        for (const el of ovalEls) {
          el?.style.setProperty('fill-opacity', next ? '1' : '0')
          el?.setAttribute('fill-opacity', next ? '1' : '0')
        }
        blinkEl.style.setProperty('opacity', next ? '0' : '1')
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

    const setDizzyEyes = (on: boolean) => {
      for (const animation of animations) animation.pause()
      const ovalEls = [ovals.current.left, ovals.current.right]
      for (const el of ovalEls) {
        el?.style.setProperty('fill-opacity', on ? '0' : '1')
        el?.setAttribute('fill-opacity', on ? '0' : '1')
      }
      blink.current?.style.setProperty('opacity', '0')
      blink.current?.setAttribute('opacity', '0')
      restEyes.current?.style.setProperty('visibility', on ? 'hidden' : 'visible')
      restEyes.current?.setAttribute('visibility', on ? 'hidden' : 'visible')
      swirls.current?.style.setProperty('opacity', on ? '1' : '0')
      swirls.current?.setAttribute('opacity', on ? '1' : '0')
      open = true
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

    const recover = () => {
      recovering = true
      setDizzyEyes(false)
      lookTo(GAZE_HOME, 0)
      const count = recoveryBlinkCount()
      const next = (left: number) => {
        if (!alive) return
        if (left <= 0) {
          recovering = false
          dizzy = false
          return
        }
        closeThenOpen(() => next(left - 1))
      }
      next(count)
    }

    let firstBlink = true
    const blinkLoop = () => {
      if (!alive) return
      const wait = firstBlink ? 500 + Math.random() * 900 : 1600 + Math.random() * 4200
      firstBlink = false
      schedule(wait, () => {
        if (busy()) {
          blinkLoop()
          return
        }
        closeThenOpen(() => {
          if (busy()) {
            blinkLoop()
            return
          }
          if (Math.random() < 0.22) {
            schedule(90, () => closeThenOpen(blinkLoop))
            return
          }
          blinkLoop()
        })
      })
    }

    const lookLoop = () => {
      if (!alive) return
      if (!busy()) lookTo(pickGaze(currentLook), 180 + Math.random() * 80)
      schedule(700 + Math.random() * 1600, lookLoop)
    }

    const centerOf = () => {
      const el = root.current
      if (!el) return { cx: 0, cy: 0 }
      const box = el.getBoundingClientRect()
      return { cx: box.left + box.width / 2, cy: box.top + box.height / 2 }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (recovering) return
      event.preventDefault()
      dragging = true
      dizzy = false
      setDizzyEyes(false)
      lookTo(GAZE_HOME, 0)
      pointerId = event.pointerId
      root.current?.setPointerCapture(event.pointerId)
      lastX = event.clientX
      lastY = event.clientY
      lastT = event.timeStamp
      velocity = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return
      const { cx, cy } = centerOf()
      const dt = Math.max((event.timeStamp - lastT) / 1000, 1 / 240)
      const delta = angularDelta(cx, cy, lastX, lastY, event.clientX, event.clientY)
      rotation += delta
      const instant = clampSpin(delta / dt)
      velocity = clampSpin(velocity * 0.35 + instant * 0.65)
      lastX = event.clientX
      lastY = event.clientY
      lastT = event.timeStamp
      applySpin()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      dragging = false
      pointerId = null
      if (isFlick(velocity)) {
        dizzy = true
        velocity = flickBoost(velocity)
        lookTo(GAZE_HOME, 0)
        setDizzyEyes(true)
      }
    }

    const tick = (now: number) => {
      if (!alive) return
      const dt = Math.min((now - lastFrame) / 1000, 0.05)
      lastFrame = now
      if (!dragging) {
        rotation += velocity * dt
        velocity = decayVelocity(velocity, dt)
        if (dizzy && !recovering && Math.abs(velocity) <= SPIN_REST) recover()
      }
      if (dizzy) swirlAngle += (8 + Math.abs(velocity) * 0.35) * dt
      applySpin()
      raf = window.requestAnimationFrame(tick)
    }

    blinkLoop()
    schedule(800 + Math.random() * 700, lookLoop)
    raf = window.requestAnimationFrame(tick)

    const node = root.current
    node?.addEventListener('pointerdown', onPointerDown)
    node?.addEventListener('pointermove', onPointerMove)
    node?.addEventListener('pointerup', onPointerUp)
    node?.addEventListener('pointercancel', onPointerUp)

    return () => {
      alive = false
      window.cancelAnimationFrame(raf)
      node?.removeEventListener('pointerdown', onPointerDown)
      node?.removeEventListener('pointermove', onPointerMove)
      node?.removeEventListener('pointerup', onPointerUp)
      node?.removeEventListener('pointercancel', onPointerUp)
      for (const id of timers) window.clearTimeout(id)
      for (const animation of animations) animation.revert()
    }
  }, [])

  return (
    <div
      ref={root}
      aria-label="Echo"
      className={`pointer-events-auto box-border flex ${ECHO_ORBIT_CLASS} shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full border border-nota-terracotta p-1 active:cursor-grabbing`}
    >
      <div ref={rotator} className="h-full w-full will-change-transform">
        <svg className="h-full w-full" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="50" fill="#111" />
          <g ref={gaze}>
            <g ref={restEyes}>
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
            <g
              ref={swirls}
              fill="none"
              stroke="#fff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0"
            >
              {(['left', 'right'] as const).map((side) => (
                <g
                  key={side}
                  ref={(node) => {
                    swirlSpin.current[side] = node
                  }}
                  transform={`translate(${side === 'left' ? 34 : 66} 45)`}
                >
                  <path d={swirlPath()} />
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
})
