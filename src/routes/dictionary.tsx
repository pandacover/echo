import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AppShell } from '~/components/AppShell'
import { WelcomeGate } from '~/components/WelcomeGate'
import { AuthSwitch } from '~/components/AuthSwitch'
import { fetchLibrary } from '~/lib/notes.functions'
import type { DictionaryEntry } from '~/lib/database.types'

export const Route = createFileRoute('/dictionary')({
  loader: async ({ context }) => {
    if (!context.userId) return { dictionary: [] as DictionaryEntry[] }
    try {
      const library = await fetchLibrary()
      return { dictionary: library.dictionary }
    } catch {
      return { dictionary: [] as DictionaryEntry[] }
    }
  },
  component: DictionaryPage,
})

function DictionaryPage() {
  const { dictionary } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return dictionary
    return dictionary.filter(
      (entry) =>
        entry.word.toLowerCase().includes(needle) ||
        entry.definition.toLowerCase().includes(needle),
    )
  }, [dictionary, query])

  return (
    <AppShell wordCount={dictionary.length}>
      <AuthSwitch
        signedIn={
          <div className="px-6 pb-8 pt-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-nota-soft">VOCABULARY</p>
            <h1 className="mt-2 font-serif text-3xl">Dictionary</h1>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search words"
              className="mt-5 w-full rounded-2xl border border-nota-line bg-white/70 px-4 py-3 outline-none placeholder:text-nota-soft"
            />
            {filtered.length === 0 ? (
              <p className="mt-10 text-nota-muted">
                Terms extracted from your polished notes will land here.
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-nota-line overflow-hidden rounded-3xl border border-nota-line bg-white/70">
                {filtered.map((entry) => (
                  <li key={entry.id} className="px-5 py-4">
                    <p className="font-serif text-2xl">{entry.word}</p>
                    <p className="mt-1 text-sm leading-relaxed text-nota-muted">
                      {entry.definition || 'No definition yet'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
        signedOut={<WelcomeGate />}
      />
    </AppShell>
  )
}
