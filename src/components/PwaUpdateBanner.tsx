import { useEffect, useState } from 'react'
import {
  getPwaWaitingWorker,
  subscribePwaWaitingWorker,
} from '~/lib/pwa-update'

function askWaitingWorkerToActivate(worker: ServiceWorker) {
  worker.postMessage({ type: 'SKIP_WAITING' })
}

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    getPwaWaitingWorker,
  )
  const [updating, setUpdating] = useState(false)

  useEffect(() => subscribePwaWaitingWorker(() => {
    setWaitingWorker(getPwaWaitingWorker())
  }), [])

  if (!waitingWorker) return null

  return (
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
  )
}
