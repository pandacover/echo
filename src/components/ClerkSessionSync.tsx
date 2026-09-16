import { useEffect } from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { useRouter } from '@tanstack/react-router'
import { rememberSessionUserId } from '~/lib/session'

export function ClerkSessionSync({ routeUserId }: { routeUserId: string | null }) {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    const next = userId ?? null
    rememberSessionUserId(next)
    if ((routeUserId ?? null) === next) return
    void router.invalidate()
  }, [isLoaded, userId, routeUserId, router])

  return null
}
