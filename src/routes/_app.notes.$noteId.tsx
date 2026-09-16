import { createFileRoute, getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { NoteRichText, NoteTermsProvider } from '~/components/NoteRichText'
import { deleteNote, fetchNote } from '~/lib/notes.functions'
import { getSessionUserId } from '~/lib/session'

const appRoute = getRouteApi('/_app')

export const Route = createFileRoute('/_app/notes/$noteId')({
  staleTime: 0,
  loader: async ({ params, context }) => {
    if (!context.userId && !getSessionUserId()) return { note: null }
    return { note: await fetchNote({ data: { id: params.noteId } }) }
  },
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const { note } = Route.useLoaderData()
  const { dictionary, notes } = appRoute.useLoaderData()
  const [showRaw, setShowRaw] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const remove = useServerFn(deleteNote)
  const navigate = useNavigate()
  const router = useRouter()

  if (!note) {
    return (
      <div className="px-6 pt-10 text-nota-muted">
        This note is not available.
        <div className="mt-4">
          <Link to="/notes" className="text-sm text-nota-terracotta">
            ← Notes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <article className="px-6 pb-10 pt-2">
      <Link to="/notes" className="text-sm text-nota-terracotta">
        ← Notes
      </Link>
      <NoteTermsProvider>
        <h1 className="mt-4 font-serif text-4xl leading-tight">
          <NoteRichText
            text={note.title}
            dictionary={dictionary}
            notes={notes}
            currentNoteId={note.id}
          />
        </h1>
        <p className="mt-2 text-sm text-nota-muted">
          {note.word_count} words · {note.duration_seconds}s
        </p>
        <div className="mt-5 flex gap-2">
          <button
            className={`rounded-full px-3 py-1 text-sm ${showRaw ? 'text-nota-muted' : 'bg-nota-blush text-nota-terracotta'}`}
            onClick={() => setShowRaw(false)}
          >
            Polished
          </button>
          <button
            className={`rounded-full px-3 py-1 text-sm ${showRaw ? 'bg-nota-blush text-nota-terracotta' : 'text-nota-muted'}`}
            onClick={() => setShowRaw(true)}
          >
            Raw
          </button>
        </div>
        <div className="mt-6 font-serif text-[22px] leading-relaxed">
          <NoteRichText
            className="whitespace-pre-wrap"
            text={showRaw ? note.raw_transcript : note.polished_transcript}
            dictionary={dictionary}
            notes={notes}
            currentNoteId={note.id}
          />
        </div>
      </NoteTermsProvider>
      <button
        className="mt-10 text-sm text-nota-terracotta disabled:opacity-50"
        disabled={deleting}
        onClick={async () => {
          setDeleting(true)
          try {
            await remove({ data: { id: note.id } })
            await router.invalidate({ sync: true })
            await navigate({ to: '/notes' })
          } catch (error) {
            setDeleting(false)
            console.error(error)
          }
        }}
      >
        {deleting ? 'Deleting…' : 'Delete note'}
      </button>
    </article>
  )
}
