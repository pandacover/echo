import { Mic } from 'lucide-react'

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
      aria-label={recording ? 'Stop recording' : 'Start recording'}
      className="relative flex h-[118px] w-[118px] items-center justify-center rounded-full bg-nota-terracotta text-white shadow-[0_18px_40px_rgba(196,92,62,0.35)] transition enabled:active:scale-95 disabled:opacity-70"
    >
      {recording ? (
        <span className="absolute inset-[-14px] rounded-full border border-nota-terracotta/40 record-pulse" />
      ) : null}
      {recording ? (
        <span className="h-9 w-9 rounded-md bg-white" />
      ) : (
        <Mic size={46} strokeWidth={1.5} fill="currentColor" />
      )}
    </button>
  )
}
