import { formatRemainingTime } from '~/lib/quota'

export function QuotaPill({ remainingSeconds }: { remainingSeconds: number }) {
  const depleted = remainingSeconds <= 0

  return (
    <p
      role="status"
      className={`pointer-events-auto rounded-full border px-3 py-1.5 text-[13px] font-medium shadow-[0_8px_20px_rgba(28,23,20,0.08)] backdrop-blur-xl ${
        depleted
          ? 'border-nota-terracotta/40 bg-white/90 text-nota-terracotta'
          : 'border-nota-line/80 bg-white/80 text-nota-ink'
      }`}
    >
      {formatRemainingTime(remainingSeconds)}
    </p>
  )
}
