import { useEffect, useMemo, useState } from 'react'

export function Waveform({
  levels,
  active,
}: {
  levels: number[]
  active: boolean
}) {
  const bars = useMemo(() => {
    if (levels.length > 0) return levels
    return Array.from({ length: 48 }, (_, i) => 0.18 + Math.abs(Math.sin(i / 3)) * 0.12)
  }, [levels])

  return (
    <div className="flex h-16 w-full items-center justify-center gap-[3px] px-8">
      {bars.map((level, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full bg-nota-terracotta"
          style={{
            height: `${Math.max(8, Math.min(56, level * 56))}px`,
            opacity: 0.35 + level * 0.65,
            animation: active ? `wave-bob ${0.7 + (index % 5) * 0.12}s ease-in-out infinite` : undefined,
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
