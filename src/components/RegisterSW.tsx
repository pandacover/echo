import { useEffect, useState } from 'react'

function askWaitingWorkerToActivate(worker: ServiceWorker) {
  worker.postMessage({ type: 'SKIP_WAITING' })
}

export function RegisterSW() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

    let registration: ServiceWorkerRegistration | undefined
    let cancelled = false
    let refreshing = false

    const watchRegistration = (next: ServiceWorkerRegistration) => {
      registration = next
      if (next.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(next.waiting)
      }

      next.addEventListener('updatefound', () => {
        const installing = next.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller &&
            next.waiting
          ) {
            setWaitingWorker(next.waiting)
          }
        })
      })
    }

    void navigator.serviceWorker.register('/sw.js').then((next) => {
      if (cancelled) return
      watchRegistration(next)
      void next.update()
    })

    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const checkForUpdate = () => {
      void registration?.update()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('focus', checkForUpdate)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!waitingWorker) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-5">
      <div className="pointer-events-auto flex w-full max-w-[22rem] items-center justify-between gap-3 rounded-2xl border border-nota-line bg-white/90 px-4 py-3 text-sm shadow-[0_10px_28px_rgba(28,23,20,0.12)] backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-nota-ink">A new version of Echo is ready.</p>
        <button
          className="shrink-0 rounded-full bg-nota-terracotta px-3 py-1 font-semibold text-white disabled:opacity-70"
          disabled={updating}
          onClick={() => {
            setUpdating(true)
            askWaitingWorkerToActivate(waitingWorker)
          }}
        >
          {updating ? 'Updating…' : 'Update'}
        </button>
      </div>
    </div>
  )
}
