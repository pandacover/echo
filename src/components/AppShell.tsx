import { BookOpen } from 'lucide-react'
import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { TabBar } from './TabBar'
import { InstallPrompt } from './InstallPrompt'
import { FloatingNotices } from './FloatingNotices'
import { QuotaPill } from './QuotaPill'
import { PwaUpdateBanner } from './PwaUpdateBanner'

export function AppShell({
  children,
  wordCount = 0,
  remainingSeconds = null,
}: {
  children: React.ReactNode
  wordCount?: number
  remainingSeconds?: number | null
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-nota-bg">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div />
        <Link
          to="/"
          className="justify-self-center font-serif text-[40px] leading-none tracking-tight"
        >
          Echo
        </Link>
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/dictionary"
            preload="render"
            className="inline-flex items-center gap-1.5 rounded-full border border-nota-terracotta/30 bg-white/40 px-3 py-1.5 text-[13px] font-medium text-nota-terracotta"
          >
            <BookOpen size={14} strokeWidth={1.75} />
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Link>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8',
                },
              }}
            />
          </Show>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto pb-[calc(7.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <FloatingNotices>
        {remainingSeconds != null ? (
          <QuotaPill remainingSeconds={remainingSeconds} />
        ) : null}
        <InstallPrompt />
        <PwaUpdateBanner />
      </FloatingNotices>
      <TabBar />
    </div>
  )
}
