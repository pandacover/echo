import { BookOpen, Mic, NotebookPen } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

const tabs = [
  { to: '/', label: 'Record', icon: Mic, exact: true },
  { to: '/notes', label: 'Notes', icon: NotebookPen, exact: false },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, exact: false },
] as const

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
      <div className="pointer-events-auto relative grid w-full max-w-[22rem] grid-cols-3 rounded-full border border-nota-line/80 bg-white/80 px-1.5 py-1.5 shadow-[0_10px_32px_rgba(28,23,20,0.14)] backdrop-blur-xl">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-1.5 flex w-[calc((100%-0.75rem)/3)] justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translate3d(${active * 100}%, 0, 0)` }}
        >
          <span className="aspect-square h-full rounded-full bg-nota-terracotta shadow-[0_8px_20px_rgba(196,92,62,0.28)]" />
        </span>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            preload="render"
            aria-label={tab.label}
            activeOptions={{ exact: tab.exact }}
            className="relative z-10 flex items-center justify-center py-2.5 text-nota-ink"
            activeProps={{
              className:
                'relative z-10 flex items-center justify-center py-2.5 text-white',
            }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <tab.icon size={24} strokeWidth={isActive ? 2.2 : 1.7} />
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
