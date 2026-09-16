import { memo, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate } from 'animejs'
import { X } from 'lucide-react'
import { blinkStrokes, ovalPath, type EyeSide } from '~/lib/echo-eyes'
import { GAZE_HOME, pickGaze, type GazeOffset } from '~/lib/echo-gaze'
import {
  INSTALL_STEPS,
  boxCenter,
  bubbleSide,
  containedImageRect,
  demoFrameRect,
  hotspotCornerRadius,
  hotspotRect,
  installStep,
  isLastInstallStep,
  nextInstallIndex,
  orbitPoint,
  orbitRadii,
  type BubbleSide,
} from '~/lib/echo-install'

const ECHO_SIZE = 36
const FOOTER_H = 56

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Face-only Echo for the install guide — blinks and looks around, no spin ring. */
export const EchoIdleFace = memo(function EchoIdleFace() {
  const ovals = useRef<Record<EyeSide, SVGPathElement | null>>({ left: null, right: null })
  const blink = useRef<SVGGElement>(null)
  const gaze = useRef<SVGGElement>(null)

  useLayoutEffect(() => {
    const timers: number[] = []
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
      animate(offset, {
        x: next.x,
        y: next.y,
        duration,
        ease: 'outQuad',
        composition: 'replace',
        onRender: applyGaze,
      })
    }

    const setOpen = (next: boolean, duration: { oval: number; blink: number }) => {
      if (!alive || open === next) return
      const ovalEls = [ovals.current.left, ovals.current.right].filter(Boolean)
      const blinkEl = blink.current
      if (!ovalEls.length || !blinkEl) return
      open = next
      if (reduced) {
        for (const el of ovalEls) el?.setAttribute('fill-opacity', next ? '1' : '0')
        blinkEl.setAttribute('opacity', next ? '0' : '1')
        return
      }
      animate(ovalEls, {
        fillOpacity: next ? 1 : 0,
        duration: duration.oval,
        ease: 'inOutSine',
        composition: 'replace',
      })
      animate(blinkEl, {
        opacity: next ? 0 : 1,
        duration: duration.blink,
        ease: 'inOutSine',
        composition: 'replace',
      })
    }

    const schedule = (delay: number, work: () => void) => {
      timers.push(window.setTimeout(() => alive && work(), delay))
    }

    const closeThenOpen = (then: () => void) => {
      setOpen(false, { oval: 18, blink: 32 })
      schedule(100, () => {
        setOpen(true, { oval: 50, blink: 36 })
        schedule(70, then)
      })
    }

    const blinkLoop = () => {
      if (!alive) return
      schedule(1600 + Math.random() * 4200, () => closeThenOpen(blinkLoop))
    }

    const lookLoop = () => {
      if (!alive) return
      lookTo(pickGaze(currentLook), 180 + Math.random() * 80)
      schedule(700 + Math.random() * 1600, lookLoop)
    }

    blinkLoop()
    schedule(600, lookLoop)
    return () => {
      alive = false
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
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
})

function applyBox(
  el: HTMLElement,
  box: { x: number; y: number; w: number; h: number; r: number },
) {
  el.style.left = `${box.x}px`
  el.style.top = `${box.y}px`
  el.style.width = `${box.w}px`
  el.style.height = `${box.h}px`
  el.style.borderRadius = `${box.r}px`
}

export function EchoInstallDemo({
  origin,
  onClose,
}: {
  origin: DOMRect
  onClose: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const echo = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  const reduced = useRef(false)

  const step = installStep(stepIndex)
  const last = isLastInstallStep(stepIndex)

  useLayoutEffect(() => {
    reduced.current = prefersReducedMotion()
    const node = frame.current
    if (!node) return
    const target = demoFrameRect(window.innerWidth, window.innerHeight)
    const from = {
      x: origin.left,
      y: origin.top,
      w: origin.width,
      h: origin.height,
      r: origin.width / 2,
    }
    const to = { x: target.x, y: target.y, w: target.w, h: target.h, r: 28 }
    applyBox(node, from)
    if (reduced.current) {
      applyBox(node, to)
      setReady(true)
      return
    }
    const box = { ...from }
    const animation = animate(box, {
      x: to.x,
      y: to.y,
      w: to.w,
      h: to.h,
      r: to.r,
      duration: 560,
      ease: 'inOutCubic',
      onRender: () => applyBox(node, box),
      onComplete: () => {
        applyBox(node, to)
        setReady(true)
      },
    })
    return () => {
      animation.revert()
    }
  }, [origin])

  useLayoutEffect(() => {
    const node = stage.current
    if (!node) return
    const sync = () => {
      const rect = node.getBoundingClientRect()
      setStageSize({ w: rect.width, h: rect.height })
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ready, stepIndex])

  useLayoutEffect(() => {
    if (!ready) return
    const echoEl = echo.current
    const bubbleEl = bubble.current
    if (!echoEl || !bubbleEl || stageSize.w === 0) return
    const image = containedImageRect(stageSize.w, stageSize.h, step.imageWidth, step.imageHeight)
    const hot = hotspotRect(image, step.hotspot)
    const center = boxCenter(hot)
    const { rx, ry } = orbitRadii(hot, ECHO_SIZE)
    const place = (angle: number) => {
      const point = orbitPoint(center.x, center.y, rx, ry, angle)
      echoEl.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`
      const side = bubbleSide(point.x, point.y, stageSize.w, stageSize.h)
      bubbleEl.dataset.side = side
      positionBubble(bubbleEl, side)
    }
    if (reduced.current || stageSize.w === 0) {
      place(-0.7)
      return
    }
    const state = { angle: -0.7 }
    const animation = animate(state, {
      angle: -0.7 + Math.PI * 2,
      duration: 4200,
      ease: 'linear',
      loop: true,
      onRender: () => place(state.angle),
    })
    return () => {
      animation.revert()
    }
  }, [ready, step, stageSize.h, stageSize.w])

  const closing = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const close = () => {
    if (closing.current) return
    const node = frame.current
    const finish = () => onCloseRef.current()
    if (!node || reduced.current) {
      closing.current = true
      finish()
      return
    }
    closing.current = true
    setReady(false)
    const target = demoFrameRect(window.innerWidth, window.innerHeight)
    const box = { x: target.x, y: target.y, w: target.w, h: target.h, r: 28 }
    const to = {
      x: origin.left,
      y: origin.top,
      w: origin.width,
      h: origin.height,
      r: origin.width / 2,
    }
    animate(box, {
      x: to.x,
      y: to.y,
      w: to.w,
      h: to.h,
      r: to.r,
      duration: 420,
      ease: 'inOutCubic',
      onRender: () => applyBox(node, box),
      onComplete: finish,
    })
  }

  const closeRef = useRef(close)
  closeRef.current = close

  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [])

  const goNext = () => {
    const next = nextInstallIndex(stepIndex)
    if (next == null) {
      close()
      return
    }
    setStepIndex(next)
  }

  const image = containedImageRect(stageSize.w, stageSize.h, step.imageWidth, step.imageHeight)
  const hot = hotspotRect(image, step.hotspot)
  const radius = hotspotCornerRadius(hot)

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close install demo"
        className={`absolute inset-0 bg-nota-ink/25 transition-opacity duration-500 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />
      <div
        ref={frame}
        role="dialog"
        aria-modal="true"
        aria-labelledby="echo-install-title"
        data-testid="echo-install-demo"
        className="pointer-events-auto fixed overflow-hidden border border-nota-terracotta bg-nota-bg shadow-[0_24px_60px_rgba(28,23,20,0.22)]"
        style={{
          left: origin.left,
          top: origin.top,
          width: origin.width,
          height: origin.height,
          borderRadius: origin.width / 2,
        }}
      >
        <h2 id="echo-install-title" className="sr-only">
          How to add Echo to your home screen
        </h2>
        {ready ? (
          <div className="flex h-full flex-col">
            <div ref={stage} className="relative min-h-0 flex-1 overflow-visible bg-nota-blush/40">
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={step.image}
                  alt=""
                  className="pointer-events-none h-full w-full object-contain"
                />
              </div>
              {stageSize.w > 0 ? (
                <>
                  <div
                    aria-hidden
                    className="echo-hotspot pointer-events-none absolute"
                    style={{
                      left: hot.x,
                      top: hot.y,
                      width: hot.w,
                      height: hot.h,
                      borderRadius: radius,
                    }}
                  />
                  <div
                    ref={echo}
                    className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
                    style={{ width: ECHO_SIZE, height: ECHO_SIZE }}
                  >
                    <EchoIdleFace />
                    <div ref={bubble} className="echo-bubble" data-side="left" role="status">
                      {step.story.slice(0, -1).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      <p className="font-semibold text-nota-ink">{step.story.at(-1)}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-t border-nota-terracotta/20 bg-nota-bg px-3.5"
              style={{ height: FOOTER_H }}
            >
              <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex + 1} of ${INSTALL_STEPS.length}`}>
                {INSTALL_STEPS.map((item, index) => (
                  <span
                    key={item.id}
                    className={`h-1.5 rounded-full transition-all ${
                      index === stepIndex ? 'w-4 bg-nota-terracotta' : 'w-1.5 bg-nota-soft'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm text-nota-muted"
                  onClick={close}
                >
                  Close
                </button>
                <button
                  type="button"
                  data-testid="echo-install-next"
                  className="rounded-full bg-nota-terracotta px-4 py-1.5 text-sm font-semibold text-white"
                  onClick={goNext}
                >
                  {last ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="absolute left-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-nota-ink shadow-sm"
              onClick={close}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8">
              <EchoIdleFace />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function positionBubble(el: HTMLElement, side: BubbleSide) {
  el.style.left = ''
  el.style.right = ''
  el.style.top = ''
  el.style.bottom = ''
  el.style.transform = ''
  if (side === 'left') {
    el.style.right = 'calc(100% + 10px)'
    el.style.top = '50%'
    el.style.transform = 'translateY(-50%)'
    return
  }
  if (side === 'right') {
    el.style.left = 'calc(100% + 10px)'
    el.style.top = '50%'
    el.style.transform = 'translateY(-50%)'
    return
  }
  if (side === 'top') {
    el.style.left = '50%'
    el.style.bottom = 'calc(100% + 10px)'
    el.style.transform = 'translateX(-50%)'
    return
  }
  el.style.left = '50%'
  el.style.top = 'calc(100% + 10px)'
  el.style.transform = 'translateX(-50%)'
}
