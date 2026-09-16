import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { TabBar } from './TabBar'
import { InstallPrompt } from './InstallPrompt'
import { FloatingNotices } from './FloatingNotices'
import { QuotaPill } from './QuotaPill'
import { PwaUpdateBanner } from './PwaUpdateBanner'
import { useQuotaSession } from './QuotaSession'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { displayRemaining } = useQuotaSession()

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-nota-bg">
      <header className="px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex h-8 max-w-md items-center justify-between">
          <Link
            to="/"
            className="inline-flex h-8 items-center font-serif text-[2rem] leading-8 tracking-tight"
          >
            Echo
          </Link>
          <div className="flex h-8 w-8 items-center justify-center">
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: 'flex h-8 w-8',
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  aria-label="Sign in"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-nota-line bg-white/70 text-nota-ink"
                >
                  <User size={16} strokeWidth={1.75} />
                </button>
              </SignInButton>
            </Show>
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto pb-[calc(6.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <FloatingNotices>
        {displayRemaining != null ? (
          <QuotaPill remainingSeconds={displayRemaining} />
        ) : null}
        <InstallPrompt />
        <PwaUpdateBanner />
      </FloatingNotices>
      <TabBar />
    </div>
  )
}
