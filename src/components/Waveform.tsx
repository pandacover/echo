import { useEffect, useMemo, useState } from 'react'

function idleBars(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1)
    const envelope = Math.sin(t * Math.PI)
    const ripple = 0.45 + Math.abs(Math.sin(i / 2.1)) * 0.55
    return 0.18 + envelope * ripple * 0.55
  })
}

export function Waveform({
  levels,
  active,
  compact = false,
}: {
  levels: number[]
  active: boolean
  compact?: boolean
}) {
  const bars = useMemo(() => {
    if (levels.length > 0) return levels
    return idleBars(compact ? 40 : 48)
  }, [compact, levels])

  return (
    <div
      className={
        compact
          ? 'flex h-8 w-full max-w-[15.5rem] items-center justify-center gap-[2px]'
          : 'flex h-16 w-full items-center justify-center gap-[3px] px-8'
      }
    >
      {bars.map((level, index) => (
        <span
          key={index}
          className="rounded-full bg-nota-terracotta"
          style={{
            width: compact ? 2 : 3,
            height: `${Math.max(compact ? 4 : 8, Math.min(compact ? 22 : 56, level * (compact ? 22 : 56)))}px`,
            opacity: compact ? 0.28 + level * 0.35 : 0.35 + level * 0.65,
            animation: active
              ? `wave-bob ${0.7 + (index % 5) * 0.12}s ease-in-out infinite`
              : undefined,
            animationDelay: `${(index % 8) * 40}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function useAudioLevels(stream: MediaStream | null, active: boolean) {
  const [levels, setLevels] = useState<number[]>([])

  useEffect(() => {
    if (!stream || !active) {
      setLevels([])
      return
    }

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    let frame = 0

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const sample = Array.from({ length: 48 }, (_, i) => {
        const value = data[Math.floor((i / 48) * data.length)] ?? 0
        return Math.max(0.12, value / 180)
      })
      setLevels(sample)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      void audioContext.close()
    }
  }, [stream, active])

  return levels
}
