import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, useClerk } from '@clerk/tanstack-react-start'
import { useServerFn } from '@tanstack/react-start'
import { useNavigate } from '@tanstack/react-router'
import { RecordButton } from './RecordButton'
import { Waveform, useAudioLevels } from './Waveform'
import { processRecording } from '~/lib/notes.functions'

const QUOTA_REACHED = "You've used all of your recording time."

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

export function Recorder({
  remainingSeconds,
  onSaved,
}: {
  remainingSeconds?: number | null
  onSaved?: () => void | Promise<void>
}) {
  const navigate = useNavigate()
  const process = useServerFn(processRecording)
  const { isSignedIn, getToken } = useAuth()
  const { openSignIn } = useClerk()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const recognitionRef = useRef<SpeechRec | null>(null)
  const finishingRef = useRef(false)
  const remainingRef = useRef(remainingSeconds)

  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const levels = useAudioLevels(stream, recording)

  remainingRef.current = remainingSeconds

  const stopRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  const startRecording = useCallback(async () => {
    if (remainingRef.current != null && remainingRef.current <= 0) {
      setError(QUOTA_REACHED)
      return
    }

    setError(null)
    setPreview('')
    finishingRef.current = false
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
    if (!recorder || finishingRef.current) return
    finishingRef.current = true

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
      finishingRef.current = false
      return
    }

    setBusy(true)
    try {
      const form = new FormData()
      form.append('audio', blob, `note.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`)
      form.append('duration', String(duration))
      const clerkToken = await getToken()
      if (clerkToken) form.append('clerkToken', clerkToken)
      const result = await process({ data: form })
      await onSaved?.()
      await navigate({ to: '/notes/$noteId', params: { noteId: result.note.id } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process that recording.')
    } finally {
      setBusy(false)
      finishingRef.current = false
    }
  }, [getToken, navigate, onSaved, process, stream])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      const next = Math.round((Date.now() - startedAtRef.current) / 1000)
      setElapsed(next)
      const remaining = remainingRef.current
      if (remaining != null && remaining > 0 && next >= remaining) {
        void finishRecording()
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [finishRecording, recording])

  const onToggle = async () => {
    if (busy) return
    if (!isSignedIn) {
      openSignIn({ forceRedirectUrl: '/' })
      return
    }
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
  const showPreview = recording || busy || Boolean(preview)

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4">
      <p className="text-[15px] tracking-wide text-nota-muted">
        {busy ? 'Transcribing…' : recording ? `${minutes}:${seconds}` : 'Tap to record'}
      </p>
      <div className="mt-6 p-8">
        <RecordButton recording={recording} busy={busy} onClick={() => void onToggle()} />
      </div>
      <div className="flex w-full justify-center">
        <Waveform
          levels={levels}
          active={recording || busy}
          compact={!recording && !busy}
        />
      </div>
      {showPreview ? (
        <div className="mt-10 w-full text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-nota-soft">
            LIVE TRANSCRIPTION PREVIEW
          </p>
          <p className="mt-3 min-h-12 font-serif text-[22px] leading-snug text-nota-ink">
            {busy
              ? 'Cleaning up grammar and structure…'
              : preview || 'Listening…'}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="mt-6 max-w-sm text-center text-sm text-nota-terracotta">{error}</p>
      ) : null}
    </div>
  )
}
