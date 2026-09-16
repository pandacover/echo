import { Link } from '@tanstack/react-router'
import type { Note } from '~/lib/database.types'

export function NoteMentionLinks({
  mentions,
  currentNoteId,
}: {
  mentions: Note[]
  currentNoteId?: string
}) {
  if (mentions.length === 0) {
    return <p className="mt-1.5 text-sm text-nota-muted">No matching notes yet.</p>
  }

  return (
    <ul className="mt-1.5 space-y-1.5">
      {mentions.map((note) => {
        const isCurrent = note.id === currentNoteId
        return (
          <li key={note.id}>
            {isCurrent ? (
              <span className="text-sm font-medium text-nota-ink">
                {note.title}
                <span className="ml-1.5 text-xs font-normal text-nota-soft">This note</span>
              </span>
            ) : (
              <Link
                to="/notes/$noteId"
                params={{ noteId: note.id }}
                className="text-sm font-medium text-nota-terracotta"
              >
                {note.title}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
