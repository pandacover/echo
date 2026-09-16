import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { AppShell } from '~/components/AppShell'
import { QuotaSessionProvider } from '~/components/QuotaSession'
import type { DictionaryEntry, Note } from '~/lib/database.types'
import { fetchLibrary } from '~/lib/notes.functions'
import { resolveDisplayedRemaining, type RecordingQuota } from '~/lib/quota'
import { getSessionUserId } from '~/lib/session'

const emptyLibrary = {
  notes: [] as Note[],
  dictionary: [] as DictionaryEntry[],
  quota: null as RecordingQuota | null,
}

export const Route = createFileRoute('/_app')({
  staleTime: 10_000,
  loader: async ({ context }) => {
    const userId = context.userId ?? getSessionUserId()
    if (!userId) return emptyLibrary
    try {
      return await fetchLibrary()
    } catch {
      return emptyLibrary
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { quota } = Route.useLoaderData()
  const { userId } = Route.useRouteContext()
  const { isSignedIn, isLoaded } = useAuth()
  const remainingSeconds = resolveDisplayedRemaining(quota, {
    userId,
    isSignedIn: isLoaded ? isSignedIn : Boolean(userId),
  })

  return (
    <QuotaSessionProvider remainingSeconds={remainingSeconds}>
      <AppShell>
        <Outlet />
      </AppShell>
    </QuotaSessionProvider>
  )
}
