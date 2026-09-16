import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, NotebookPen } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { NoteMentionLinks } from './NoteMentionLinks'
import type { DictionaryEntry, Note } from '~/lib/database.types'

function useFineHover() {
  const [fineHover, setFineHover] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setFineHover(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return fineHover
}

export function DictionaryTerm({
  text,
  entry,
  mentions,
  currentNoteId,
  open,
  onOpen,
  onClose,
}: {
  text: string
  entry: DictionaryEntry
  mentions: Note[]
  currentNoteId: string
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, place: 'below' as 'below' | 'above' })
  const fineHover = useFineHover()

  const cancelClose = () => {
    window.clearTimeout(closeTimer.current)
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => onClose(), 180)
  }

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 24)
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    )
    const spaceBelow = window.innerHeight - rect.bottom
    const place = spaceBelow < 240 && rect.top > 240 ? 'above' : 'below'
    const top = place === 'below' ? rect.bottom + 8 : rect.top - 8
    setCoords({ top, left, place })
  }

  const openPopover = () => {
    cancelClose()
    updatePosition()
    onOpen()
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return
      }
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onReposition = () => updatePosition()
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [onClose, open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="dictionary-term"
        aria-expanded={open}
        aria-haspopup="dialog"
        onMouseEnter={() => {
          if (fineHover) openPopover()
        }}
        onMouseLeave={() => {
          if (fineHover) scheduleClose()
        }}
        onFocus={() => {
          if (fineHover) openPopover()
        }}
        onBlur={(event) => {
          if (!fineHover) return
          const next = event.relatedTarget as Node | null
          if (popoverRef.current?.contains(next)) return
          scheduleClose()
        }}
        onClick={() => {
          if (fineHover) return
          if (open) onClose()
          else openPopover()
        }}
      >
        {text}
      </button>
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={entry.word}
              className="pointer-events-auto fixed z-[60] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-nota-line bg-white/95 p-4 text-left shadow-[0_16px_40px_rgba(28,23,20,0.16)] backdrop-blur-xl"
              style={{
                top: coords.place === 'below' ? coords.top : undefined,
                bottom:
                  coords.place === 'above' ? window.innerHeight - coords.top : undefined,
                left: coords.left,
              }}
              onMouseEnter={() => {
                if (fineHover) cancelClose()
              }}
              onMouseLeave={() => {
                if (fineHover) scheduleClose()
              }}
            >
              <p className="font-serif text-2xl leading-tight text-nota-ink">{entry.word}</p>
              <p className="mt-2 text-sm leading-relaxed text-nota-muted">
                {entry.definition || 'No definition yet.'}
              </p>

              <div className="mt-4 border-t border-nota-line pt-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-nota-soft">
                  <BookOpen size={13} strokeWidth={1.75} />
                  DICTIONARY
                </p>
                <Link
                  to="/dictionary"
                  search={{ q: entry.word }}
                  className="mt-2 inline-flex rounded-full bg-nota-blush px-3 py-1.5 text-sm font-medium text-nota-terracotta"
                >
                  Open in dictionary
                </Link>
              </div>

              <div className="mt-3 border-t border-nota-line pt-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-nota-soft">
                  <NotebookPen size={13} strokeWidth={1.75} />
                  IN NOTES
                </p>
                <NoteMentionLinks mentions={mentions} currentNoteId={currentNoteId} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
