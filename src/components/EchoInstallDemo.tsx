import { memo, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate } from 'animejs'
import { blinkStrokes, ovalPath, type EyeSide } from '~/lib/echo-eyes'
import { GAZE_HOME, pickGaze, type GazeOffset } from '~/lib/echo-gaze'
import {
  ECHO_SIZE,
  FRAME_FOOTER_H,
  INSTALL_STEPS,
  containedImageRect,
  demoFrameRect,
  echoRestPosition,
  hotspotCornerRadius,
  hotspotRect,
  installStep,
  isLastInstallStep,
  nextInstallIndex,
  type BubbleSide,
} from '~/lib/echo-install'

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

function applyEcho(el: HTMLElement, x: number, y: number) {
  el.style.left = `${x - ECHO_SIZE / 2}px`
  el.style.top = `${y - ECHO_SIZE / 2}px`
}

function stageBox(frameBox: { x: number; y: number; w: number; h: number }) {
  return { x: frameBox.x, y: frameBox.y, w: frameBox.w, h: Math.max(0, frameBox.h - FRAME_FOOTER_H) }
}

function restOnStage(
  frameBox: { x: number; y: number; w: number; h: number },
  step: (typeof INSTALL_STEPS)[number],
) {
  const stage = stageBox(frameBox)
  const image = containedImageRect(stage.w, stage.h, step.imageWidth, step.imageHeight)
  const hot = hotspotRect(image, step.hotspot)
  const rest = echoRestPosition(hot, stage.w, stage.h, step.bias)
  return {
    x: stage.x + rest.x,
    y: stage.y + rest.y,
    side: rest.side,
    hot: { x: hot.x, y: hot.y, w: hot.w, h: hot.h, r: hotspotCornerRadius(hot) },
  }
}

export function EchoInstallDemo({
  origin,
  onClose,
}: {
  origin: DOMRect
  onClose: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const echo = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const pinBottom = useRef<number | null>(null)
  const echoPos = useRef({ x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 })
  const [stepIndex, setStepIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [hot, setHot] = useState({ x: 0, y: 0, w: 0, h: 0, r: 16 })
  const reduced = useRef(false)
  const closing = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const step = installStep(stepIndex)
  const last = isLastInstallStep(stepIndex)

  const showBubble = (side: BubbleSide, visible: boolean) => {
    const bubbleEl = bubble.current
    if (!bubbleEl) return
    bubbleEl.dataset.side = side
    positionBubble(bubbleEl, side)
    bubbleEl.style.opacity = visible ? '1' : '0'
  }

  const moveEcho = (toX: number, toY: number, side: BubbleSide, duration: number) => {
    const echoEl = echo.current
    if (!echoEl) return
    const from = { ...echoPos.current }
    if (reduced.current || duration === 0) {
      echoPos.current = { x: toX, y: toY }
      applyEcho(echoEl, toX, toY)
      showBubble(side, true)
      return
    }
    showBubble(side, false)
    const box = { x: from.x, y: from.y }
    animate(box, {
      x: toX,
      y: toY,
      duration,
      ease: 'inOutCubic',
      onRender: () => {
        echoPos.current = { x: box.x, y: box.y }
        applyEcho(echoEl, box.x, box.y)
      },
      onComplete: () => {
        echoPos.current = { x: toX, y: toY }
        applyEcho(echoEl, toX, toY)
        showBubble(side, true)
      },
    })
  }

  useLayoutEffect(() => {
    reduced.current = prefersReducedMotion()
    const node = frame.current
    const echoEl = echo.current
    if (!node || !echoEl) return
    const start = {
      x: origin.left,
      y: origin.top,
      w: origin.width,
      h: origin.height,
      r: origin.width / 2,
    }
    const target = demoFrameRect(
      window.innerWidth,
      window.innerHeight,
      INSTALL_STEPS[0].imageWidth,
      INSTALL_STEPS[0].imageHeight,
    )
    pinBottom.current = target.y + target.h
    const rest = restOnStage(target, INSTALL_STEPS[0])
    applyBox(node, start)
    echoPos.current = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 }
    applyEcho(echoEl, echoPos.current.x, echoPos.current.y)
    showBubble(rest.side, false)
    setHot(rest.hot)
    if (reduced.current) {
      applyBox(node, { x: target.x, y: target.y, w: target.w, h: target.h, r: 28 })
      echoPos.current = { x: rest.x, y: rest.y }
      applyEcho(echoEl, rest.x, rest.y)
      showBubble(rest.side, true)
      setReady(true)
      return
    }
    const box = { ...start }
    const animation = animate(box, {
      x: target.x,
      y: target.y,
      w: target.w,
      h: target.h,
      r: 28,
      duration: 560,
      ease: 'inOutCubic',
      onRender: () => applyBox(node, box),
      onComplete: () => {
        applyBox(node, { x: target.x, y: target.y, w: target.w, h: target.h, r: 28 })
        setReady(true)
      },
    })
    moveEcho(rest.x, rest.y, rest.side, 560)
    return () => {
      animation.revert()
    }
  }, [origin])

  useLayoutEffect(() => {
    if (!ready || closing.current) return
    const node = frame.current
    if (!node) return
    const target = demoFrameRect(
      window.innerWidth,
      window.innerHeight,
      step.imageWidth,
      step.imageHeight,
      pinBottom.current ?? undefined,
    )
    pinBottom.current = target.y + target.h
    const rest = restOnStage(target, step)
    setHot(rest.hot)
    const rect = node.getBoundingClientRect()
    const from = { x: rect.left, y: rect.top, w: rect.width, h: rect.height, r: 28 }
    const to = { x: target.x, y: target.y, w: target.w, h: target.h, r: 28 }
    if (stepIndex > 0) moveEcho(rest.x, rest.y, rest.side, 480)
    if (Math.abs(from.w - to.w) < 2 && Math.abs(from.h - to.h) < 2) {
      applyBox(node, to)
      return
    }
    if (reduced.current) {
      applyBox(node, to)
      return
    }
    const box = { ...from }
    const animation = animate(box, {
      x: to.x,
      y: to.y,
      w: to.w,
      h: to.h,
      r: to.r,
      duration: 420,
      ease: 'inOutCubic',
      onRender: () => applyBox(node, box),
      onComplete: () => applyBox(node, to),
    })
    return () => {
      animation.pause()
    }
  }, [ready, step])

  const close = () => {
    if (closing.current) return
    const node = frame.current
    const echoEl = echo.current
    const finish = () => onCloseRef.current()
    closing.current = true
    if (!node || !echoEl || reduced.current) {
      finish()
      return
    }
    showBubble('left', false)
    const home = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 }
    moveEcho(home.x, home.y, 'left', 420)
    const rect = node.getBoundingClientRect()
    const box = { x: rect.left, y: rect.top, w: rect.width, h: rect.height, r: 28 }
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

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close install demo"
        className={`absolute inset-0 bg-nota-ink/45 transition-opacity duration-500 ${
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
        <div className="flex h-full flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-nota-blush/50">
            <img
              src={step.image}
              alt=""
              className="pointer-events-none h-full w-full object-contain"
            />
            {hot.w > 0 ? (
              <div
                aria-hidden
                className="echo-hotspot pointer-events-none absolute"
                style={{
                  left: hot.x,
                  top: hot.y,
                  width: hot.w,
                  height: hot.h,
                  borderRadius: hot.r,
                }}
              />
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-t border-nota-terracotta/20 bg-nota-bg px-3.5"
            style={{ height: FRAME_FOOTER_H }}
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
        </div>
      </div>
      <div
        ref={echo}
        className="pointer-events-none fixed z-[81] will-change-transform"
        style={{
          width: ECHO_SIZE,
          height: ECHO_SIZE,
          left: origin.left,
          top: origin.top,
        }}
      >
        <EchoIdleFace />
        <div ref={bubble} className="echo-bubble" data-side="left" role="status" style={{ opacity: 0 }}>
          {step.story.slice(0, -1).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="font-semibold text-nota-ink">{step.story.at(-1)}</p>
        </div>
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
