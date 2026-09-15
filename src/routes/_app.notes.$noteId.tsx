import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { deleteNote, fetchNote } from '~/lib/notes.functions'

export const Route = createFileRoute('/_app/notes/$noteId')({
  staleTime: 30_000,
  loader: async ({ params, context }) => {
    if (!context.userId) return { note: null }
    return { note: await fetchNote({ data: { id: params.noteId } }) }
  },
  component: NoteDetailPage,
})

function NoteDetailPage() {
  const { note } = Route.useLoaderData()
  const [showRaw, setShowRaw] = useState(false)
  const remove = useServerFn(deleteNote)
  const navigate = useNavigate()
  const router = useRouter()

  if (!note) {
    return <div className="px-6 pt-10 text-nota-muted">Sign in to read this note.</div>
  }

  return (
    <article className="px-6 pb-10 pt-2">
      <Link to="/notes" className="text-sm text-nota-terracotta">
        ← Notes
      </Link>
      <h1 className="mt-4 font-serif text-4xl leading-tight">{note.title}</h1>
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
      <p className="mt-6 whitespace-pre-wrap font-serif text-[22px] leading-relaxed">
        {showRaw ? note.raw_transcript : note.polished_transcript}
      </p>
      <button
        className="mt-10 text-sm text-nota-terracotta"
        onClick={async () => {
          await remove({ data: { id: note.id } })
          await router.invalidate()
          await navigate({ to: '/notes' })
        }}
      >
        Delete note
      </button>
    </article>
  )
}
