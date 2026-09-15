import { BookOpen, Mic, NotebookPen } from 'lucide-react'
import { Link } from '@tanstack/react-router'

const tabs = [
  { to: '/', label: 'Record', icon: Mic, exact: true },
  { to: '/notes', label: 'Notes', icon: NotebookPen, exact: false },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, exact: false },
] as const

export function TabBar() {
  return (
    <nav className="grid grid-cols-3 border-t border-nota-line bg-nota-bg/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: tab.exact }}
          className="flex flex-col items-center gap-1 py-1 text-[11px] text-nota-muted"
          activeProps={{
            className:
              'flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-nota-terracotta',
          }}
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              <span
                className={
                  isActive
                    ? 'flex h-10 w-10 items-center justify-center rounded-full bg-nota-terracotta text-white shadow-[0_8px_20px_rgba(196,92,62,0.28)]'
                    : 'flex h-10 w-10 items-center justify-center rounded-full text-nota-ink'
                }
              >
                <tab.icon size={20} strokeWidth={isActive ? 2.1 : 1.6} />
              </span>
              {tab.label}
            </>
          )}
        </Link>
      ))}
    </nav>
  )
}
