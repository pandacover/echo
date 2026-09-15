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
    <div className="install-banner px-5 pb-2">
      <div className="flex items-center justify-between rounded-2xl border border-nota-line bg-white/80 px-4 py-3 text-sm shadow-sm">
        <p className="pr-3 text-nota-ink">Install Nota on your home screen</p>
        <div className="flex shrink-0 gap-2">
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
