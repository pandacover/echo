import { BookOpen } from 'lucide-react'
import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { TabBar } from './TabBar'
import { InstallPrompt } from './InstallPrompt'

export function AppShell({
  children,
  wordCount = 0,
}: {
  children: React.ReactNode
  wordCount?: number
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-nota-bg">
      <header className="flex items-center justify-between px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link to="/" className="font-serif text-[40px] leading-none tracking-tight">
          Nota
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/dictionary"
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
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      <InstallPrompt />
      <TabBar />
    </div>
  )
}
