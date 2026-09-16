import { useEffect } from 'react'
import { setPwaWaitingWorker } from '~/lib/pwa-update'

export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

    let registration: ServiceWorkerRegistration | undefined
    let cancelled = false
    let refreshing = false

    const watchRegistration = (next: ServiceWorkerRegistration) => {
      registration = next
      if (next.waiting && navigator.serviceWorker.controller) {
        setPwaWaitingWorker(next.waiting)
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
            setPwaWaitingWorker(next.waiting)
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

  return null
}
