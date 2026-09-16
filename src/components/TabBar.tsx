import { BookOpen, Mic, NotebookPen } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

const tabs = [
  { to: '/', label: 'Record', icon: Mic, exact: true },
  { to: '/notes', label: 'Notes', icon: NotebookPen, exact: false },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, exact: false },
] as const

/** Same inset on every side, measured to the icon chip. */
const NAV_PAD = 4.5
const ICON_H = 43.5
/** Wider than tall so the active chip is a stadium, not a circle. */
const ICON_W = 66
const ICON_GAP = 3
/** Glyph fills most of the chip; slightly wider than tall. */
const GLYPH_H = 27
const GLYPH_W = 33
const SLOT = ICON_W + ICON_GAP

function tabIndex(pathname: string) {
  if (pathname.startsWith('/notes')) return 1
  if (pathname.startsWith('/dictionary')) return 2
  return 0
}

export function TabBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const active = tabIndex(pathname)

  return (
    <nav
      aria-label="Floating tab bar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto relative flex rounded-full border border-nota-line/80 bg-white/80 shadow-[0_10px_32px_rgba(28,23,20,0.14)] backdrop-blur-xl"
        style={{ padding: NAV_PAD, gap: ICON_GAP }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-nota-terracotta shadow-[0_8px_20px_rgba(196,92,62,0.28)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            top: NAV_PAD,
            left: NAV_PAD,
            width: ICON_W,
            height: ICON_H,
            transform: `translate3d(${active * SLOT}px, 0, 0)`,
          }}
        />
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            preload="render"
            aria-label={tab.label}
            activeOptions={{ exact: tab.exact }}
            className="relative z-10 flex items-center justify-center text-nota-ink"
            activeProps={{
              className: 'relative z-10 flex items-center justify-center text-white',
            }}
            style={{ width: ICON_W, height: ICON_H }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <tab.icon
                width={GLYPH_W}
                height={GLYPH_H}
                strokeWidth={isActive ? 2.2 : 1.7}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
