import { BookOpen, Mic, NotebookPen } from 'lucide-react'
import { Link } from '@tanstack/react-router'

const tabs = [
  { to: '/', label: 'Record', icon: Mic, exact: true },
  { to: '/notes', label: 'Notes', icon: NotebookPen, exact: false },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, exact: false },
] as const

export function TabBar() {
  return (
    <nav
      aria-label="Floating tab bar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto grid w-full max-w-[22rem] grid-cols-3 rounded-full border border-nota-line/80 bg-white/80 px-1.5 py-1.5 shadow-[0_10px_32px_rgba(28,23,20,0.14)] backdrop-blur-xl">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            preload="render"
            activeOptions={{ exact: tab.exact }}
            className="flex flex-col items-center gap-0.5 py-0.5 text-[11px] text-nota-muted"
            activeProps={{
              className:
                'flex flex-col items-center gap-0.5 py-0.5 text-[11px] font-semibold text-nota-terracotta',
            }}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span
                  className={
                    isActive
                      ? 'flex h-9 w-9 items-center justify-center rounded-full bg-nota-terracotta text-white shadow-[0_8px_20px_rgba(196,92,62,0.28)]'
                      : 'flex h-9 w-9 items-center justify-center rounded-full text-nota-ink'
                  }
                >
                  <tab.icon size={18} strokeWidth={isActive ? 2.1 : 1.6} />
                </span>
                {tab.label}
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
