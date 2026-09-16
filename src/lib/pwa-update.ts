let waitingWorker: ServiceWorker | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function setPwaWaitingWorker(worker: ServiceWorker | null) {
  waitingWorker = worker
  emit()
}

export function getPwaWaitingWorker() {
  return waitingWorker
}

export function subscribePwaWaitingWorker(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
