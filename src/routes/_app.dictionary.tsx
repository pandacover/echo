import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SignInHint } from '~/components/SignInHint'
import { NoteMentionLinks } from '~/components/NoteMentionLinks'
import { normalizeWordKey, notesMentioningWord } from '~/lib/dictionary-text'

const appRoute = getRouteApi('/_app')

export const Route = createFileRoute('/_app/dictionary')({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === 'string' ? search.q.trim() : ''
    return q ? { q } : {}
  },
  component: DictionaryPage,
})

function DictionaryPage() {
  const { dictionary, notes } = appRoute.useLoaderData()
  const { q } = Route.useSearch()
  const [query, setQuery] = useState(q ?? '')
  const highlightKey = q ? normalizeWordKey(q) : ''
  const highlightRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (q != null) setQuery(q)
  }, [q])

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightKey, dictionary])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = !needle
      ? dictionary
      : dictionary.filter(
          (entry) =>
            entry.word.toLowerCase().includes(needle) ||
            entry.definition.toLowerCase().includes(needle),
        )
    if (!highlightKey) return matches
    return [...matches].sort((a, b) => {
      const aExact = normalizeWordKey(a.word) === highlightKey ? 0 : 1
      const bExact = normalizeWordKey(b.word) === highlightKey ? 0 : 1
      return aExact - bExact
    })
  }, [dictionary, highlightKey, query])

  return (
    <div className="px-6 pb-8 pt-4">
      <h1 className="font-serif text-3xl">Dictionary</h1>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search words"
        className="mt-5 w-full rounded-2xl border border-nota-line bg-white/70 px-4 py-3 outline-none placeholder:text-nota-soft"
      />
      {dictionary.length === 0 ? (
        <>
          <p className="mt-10 text-nota-muted">
            Terms extracted from your polished notes will land here.
          </p>
          <SignInHint message="Sign in so dictionary words stay attached to your notes." />
        </>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-nota-muted">No words match that search.</p>
      ) : (
        <ul className="mt-6 divide-y divide-nota-line overflow-hidden rounded-3xl border border-nota-line bg-white/70">
          {filtered.map((entry) => {
            const active = highlightKey === normalizeWordKey(entry.word)
            return (
              <li
                key={entry.id}
                ref={active ? highlightRef : undefined}
                className={`px-5 py-4 ${active ? 'bg-nota-blush/70' : ''}`}
              >
                <p className="font-serif text-2xl">{entry.word}</p>
                <p className="mt-1 text-sm leading-relaxed text-nota-muted">
                  {entry.definition || 'No definition yet'}
                </p>
                <div className="mt-3">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-nota-soft">
                    IN NOTES
                  </p>
                  <NoteMentionLinks mentions={notesMentioningWord(notes, entry.word)} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
