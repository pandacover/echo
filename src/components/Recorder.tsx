import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useNavigate } from '@tanstack/react-router'
import { RecordButton } from './RecordButton'
import { Waveform, useAudioLevels } from './Waveform'
import { processRecording } from '~/lib/notes.functions'

type SpeechRec = {
  start: () => void
  stop: () => void
  abort: () => void
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onerror: (() => void) | null
}

function createSpeechRecognition(): SpeechRec | null {
  const SpeechCtor =
    (window as Window & { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
  if (!SpeechCtor) return null
  const recognition = new SpeechCtor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  return recognition
}

function pickMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function Recorder({ onSaved }: { onSaved?: () => void }) {
  const navigate = useNavigate()
  const process = useServerFn(processRecording)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const recognitionRef = useRef<SpeechRec | null>(null)

  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const levels = useAudioLevels(stream, recording)

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000))
    }, 250)
    return () => window.clearInterval(timer)
  }, [recording])

  const stopRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  const startRecording = useCallback(async () => {
    setError(null)
    setPreview('')
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(media, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined)
    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setStream(media)
    setRecording(true)
    setElapsed(0)
    recorder.start(250)

    const recognition = createSpeechRecognition()
    if (recognition) {
      recognition.onresult = (event) => {
        let text = ''
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript
        }
        setPreview(text.trim())
      }
      recognition.onerror = () => undefined
      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        /* already started */
      }
    }
  }, [])

  const finishRecording = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder) return

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      if (recorder.state !== 'inactive') recorder.stop()
    })

    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
    setRecording(false)
    stopRecognition()

    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    if (blob.size < 200) {
      setError('That recording was too short. Try again.')
      return
    }

    setBusy(true)
    try {
      const form = new FormData()
      form.append('audio', blob, `note.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`)
      form.append('duration', String(duration))
      const result = await process({ data: form })
      onSaved?.()
      await navigate({ to: '/notes/$noteId', params: { noteId: result.note.id } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process that recording.')
    } finally {
      setBusy(false)
    }
  }, [navigate, onSaved, process, stream])

  const onToggle = async () => {
    if (busy) return
    try {
      if (recording) {
        await finishRecording()
      } else {
        await startRecording()
      }
    } catch (caught) {
      setRecording(false)
      setStream(null)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Microphone access is required to record notes.',
      )
    }
  }

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
      stopRecognition()
    }
  }, [stream])

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-4 pt-10">
      <p className="text-[15px] tracking-wide text-nota-muted">
        {busy ? 'Transcribing…' : recording ? `${minutes}:${seconds}` : 'Tap to record'}
      </p>
      <div className="mt-8">
        <RecordButton recording={recording} busy={busy} onClick={() => void onToggle()} />
      </div>
      <div className="mt-12 w-full">
        <Waveform levels={levels} active={recording || busy} />
      </div>
      <div className="mt-10 w-full text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-nota-soft">
          LIVE TRANSCRIPTION PREVIEW
        </p>
        <p className="mt-3 min-h-12 font-serif text-[22px] leading-snug text-nota-ink">
          {busy
            ? 'Cleaning up grammar and structure…'
            : preview || (recording ? 'Listening…' : 'Meeting with Priya about Q3…')}
        </p>
      </div>
      {error ? (
        <p className="mt-6 max-w-sm text-center text-sm text-nota-terracotta">{error}</p>
      ) : null}
    </div>
  )
}
