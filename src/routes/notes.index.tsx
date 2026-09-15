import { createFileRoute, Link } from '@tanstack/react-router'
import { AppShell } from '~/components/AppShell'
import { WelcomeGate } from '~/components/WelcomeGate'
import { AuthSwitch } from '~/components/AuthSwitch'
import { fetchLibrary } from '~/lib/notes.functions'
import type { Note } from '~/lib/database.types'

export const Route = createFileRoute('/notes/')({
  loader: async ({ context }) => {
    if (!context.userId) return { notes: [] as Note[], wordCount: 0 }
    try {
      const library = await fetchLibrary()
      return { notes: library.notes, wordCount: library.dictionary.length }
    } catch {
      return { notes: [] as Note[], wordCount: 0 }
    }
  },
  component: NotesPage,
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function NotesPage() {
  const { notes, wordCount } = Route.useLoaderData()

  return (
    <AppShell wordCount={wordCount}>
      <AuthSwitch
        signedIn={
          <div className="px-6 pb-8 pt-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-nota-soft">YOUR LIBRARY</p>
            <h1 className="mt-2 font-serif text-3xl">Notes</h1>
            {notes.length === 0 ? (
              <p className="mt-10 text-nota-muted">
                No notes yet. Record a thought and Whisper will file it here.
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      to="/notes/$noteId"
                      params={{ noteId: note.id }}
                      className="block rounded-3xl border border-nota-line bg-white/70 px-5 py-4"
                    >
                      <p className="font-serif text-xl leading-snug">{note.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-nota-muted">
                        {note.polished_transcript}
                      </p>
                      <p className="mt-3 text-xs text-nota-soft">
                        {formatDate(note.created_at)} · {note.word_count} words
                      </p>
                    </Link>
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
