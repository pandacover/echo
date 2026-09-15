import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '~/components/AppShell'
import type { DictionaryEntry, Note } from '~/lib/database.types'
import { fetchLibrary } from '~/lib/notes.functions'

const emptyLibrary = {
  notes: [] as Note[],
  dictionary: [] as DictionaryEntry[],
}

export const Route = createFileRoute('/_app')({
  staleTime: Infinity,
  shouldReload: false,
  loader: async ({ context }) => {
    if (!context.userId) return emptyLibrary
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
