import { Mic, Square } from 'lucide'
import { MorphIcon } from 'morphicons/react'

export function RecordButton({
  recording,
  busy,
  onClick,
}: {
  recording: boolean
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={recording}
      aria-label={recording ? 'Stop recording' : 'Start recording'}
      className="relative isolate flex h-[118px] w-[118px] items-center justify-center rounded-full bg-nota-terracotta text-white shadow-[0_18px_40px_rgba(196,92,62,0.28)] transition enabled:active:scale-95 disabled:opacity-70"
    >
      <span className="pointer-events-none absolute inset-[-36px] -z-10 rounded-full bg-nota-terracotta/30 blur-2xl" />
      {recording ? (
        <span className="absolute inset-[-14px] rounded-full border border-nota-terracotta/40 record-pulse" />
      ) : null}
      <MorphIcon
        icon={recording ? Square : Mic}
        size={46}
        strokeWidth={1.75}
        color="currentColor"
        spring="smooth"
      />
    </button>
  )
}
