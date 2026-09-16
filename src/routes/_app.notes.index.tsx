import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { SignInHint } from '~/components/SignInHint'

const appRoute = getRouteApi('/_app')

export const Route = createFileRoute('/_app/notes/')({
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
  const { notes } = appRoute.useLoaderData()

  return (
    <div className="px-6 pb-8 pt-4">
      <h1 className="font-serif text-3xl">Notes</h1>
      {notes.length === 0 ? (
        <>
          <p className="mt-10 text-nota-muted">
            No notes yet. Record a thought and Whisper will file it here.
          </p>
          <SignInHint message="Sign in to save and revisit your transcripts." />
        </>
      ) : (
        <ul className="mt-6 space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to="/notes/$noteId"
                params={{ noteId: note.id }}
                preload="intent"
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
  )
}
