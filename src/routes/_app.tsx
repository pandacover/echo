import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '~/components/AppShell'
import type { DictionaryEntry, Note } from '~/lib/database.types'
import { fetchLibrary } from '~/lib/notes.functions'
import { DEFAULT_QUOTA_SECONDS, type RecordingQuota } from '~/lib/quota'
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
  const { dictionary, quota } = Route.useLoaderData()
  const { userId } = Route.useRouteContext()
  const remainingSeconds =
    quota?.remainingSeconds ?? (userId ? null : DEFAULT_QUOTA_SECONDS)

  return (
    <AppShell
      wordCount={dictionary.length}
      remainingSeconds={remainingSeconds}
    >
      <Outlet />
    </AppShell>
  )
}
