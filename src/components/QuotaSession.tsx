import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { liveRemainingSeconds } from '~/lib/quota'

type QuotaSessionValue = {
  remainingSeconds: number | null
  displayRemaining: number | null
  setLiveElapsed: (seconds: number) => void
  rememberRemaining: (seconds: number) => void
}

const QuotaSessionContext = createContext<QuotaSessionValue | null>(null)

export function QuotaSessionProvider({
  remainingSeconds,
  children,
}: {
  remainingSeconds: number | null
  children: ReactNode
}) {
  const [liveElapsed, setLiveElapsedState] = useState(0)
  const [overrideRemaining, setOverrideRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (remainingSeconds != null) setOverrideRemaining(null)
  }, [remainingSeconds])

  const effectiveRemaining = overrideRemaining ?? remainingSeconds
  const displayRemaining = liveRemainingSeconds(effectiveRemaining, liveElapsed)

  const setLiveElapsed = useCallback((seconds: number) => {
    setLiveElapsedState(Math.max(0, seconds))
  }, [])

  const rememberRemaining = useCallback((seconds: number) => {
    setOverrideRemaining(Math.max(0, seconds))
  }, [])

  const value = useMemo(
    () => ({
      remainingSeconds: effectiveRemaining,
      displayRemaining,
      setLiveElapsed,
      rememberRemaining,
    }),
    [displayRemaining, effectiveRemaining, rememberRemaining, setLiveElapsed],
  )

  return (
    <QuotaSessionContext.Provider value={value}>{children}</QuotaSessionContext.Provider>
  )
}

export function useQuotaSession() {
  const context = useContext(QuotaSessionContext)
  if (!context) {
    return {
      remainingSeconds: null,
      displayRemaining: null,
      setLiveElapsed: () => undefined,
      rememberRemaining: () => undefined,
    }
  }
  return context
}
