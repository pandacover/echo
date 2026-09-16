import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '~/components/AppShell'
import type { DictionaryEntry, Note } from '~/lib/database.types'
import { fetchLibrary } from '~/lib/notes.functions'
import { getSessionUserId } from '~/lib/session'

const emptyLibrary = {
  notes: [] as Note[],
  dictionary: [] as DictionaryEntry[],
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
  const { dictionary } = Route.useLoaderData()

  return (
    <AppShell wordCount={dictionary.length}>
      <Outlet />
    </AppShell>
  )
}
