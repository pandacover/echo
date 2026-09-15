import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!deferred || hidden) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-5">
      <div className="install-banner pointer-events-auto flex w-full max-w-[22rem] items-center justify-between gap-3 rounded-2xl border border-nota-line bg-white/90 px-4 py-3 text-sm shadow-[0_10px_28px_rgba(28,23,20,0.12)] backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-nota-ink">Install Echo on your home screen</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="text-nota-muted"
            onClick={() => {
              setHidden(true)
              setDeferred(null)
            }}
          >
            Later
          </button>
          <button
            className="rounded-full bg-nota-terracotta px-3 py-1 font-semibold text-white"
            onClick={async () => {
              await deferred.prompt()
              setHidden(true)
              setDeferred(null)
            }}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
