import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, useClerk } from '@clerk/tanstack-react-start'
import { useServerFn } from '@tanstack/react-start'
import { useNavigate } from '@tanstack/react-router'
import { RecordButton } from './RecordButton'
import { Waveform, useAudioLevels } from './Waveform'
import { useQuotaSession } from './QuotaSession'
import { fetchRecordingQuota, processRecording } from '~/lib/notes.functions'
import {
  QUOTA_LOOKUP_FAILED,
  QUOTA_REACHED,
  QUOTA_STOPPED,
  QUOTA_TOO_SHORT_AT_CAP,
  shouldStopForQuota,
} from '~/lib/quota'

type StopReason = 'user' | 'quota' | 'leave'

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

function elapsedSecondsSince(startedAt: number) {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000))
}

export function Recorder({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const navigate = useNavigate()
  const process = useServerFn(processRecording)
  const loadQuota = useServerFn(fetchRecordingQuota)
  const { isSignedIn, getToken } = useAuth()
  const { openSignIn } = useClerk()
  const { remainingSeconds, displayRemaining, setLiveElapsed, rememberRemaining } =
    useQuotaSession()

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const recognitionRef = useRef<SpeechRec | null>(null)
  const finishingRef = useRef(false)
  const remainingRef = useRef(remainingSeconds)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingRef = useRef(false)
  const finishRef = useRef<(reason?: StopReason) => Promise<void>>(async () => undefined)

  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const levels = useAudioLevels(stream, recording)

  remainingRef.current = remainingSeconds
  streamRef.current = stream
  recordingRef.current = recording

  const stopRecognition = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }

  const startRecording = useCallback(async () => {
    let remaining = remainingRef.current
    if (remaining == null) {
      try {
        const token = await getToken()
        const quota = await loadQuota({ data: token ? { clerkToken: token } : {} })
        remaining = quota.remainingSeconds
        remainingRef.current = remaining
        rememberRemaining(remaining)
      } catch {
        setError(QUOTA_LOOKUP_FAILED)
        return
      }
    }
    if (remaining <= 0) {
      setError(QUOTA_REACHED)
      return
    }

    setError(null)
    setStatus(null)
    setPreview('')
    finishingRef.current = false
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })

    remaining = remainingRef.current ?? remaining
    if (remaining <= 0) {
      media.getTracks().forEach((track) => track.stop())
      setError(QUOTA_REACHED)
      return
    }

    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(media, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined)
    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    streamRef.current = media
    setStream(media)
    setRecording(true)
    setElapsed(0)
    setLiveElapsed(0)
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
  }, [getToken, loadQuota, rememberRemaining, setLiveElapsed])

  const finishRecording = useCallback(
    async (reason: StopReason = 'user') => {
      const recorder = recorderRef.current
      if (!recorder || finishingRef.current) return
      finishingRef.current = true

      const blob = await new Promise<Blob>((resolve) => {
        const settle = () => {
          window.clearTimeout(failsafe)
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
        }
        const failsafe = window.setTimeout(settle, 2000)
        recorder.onstop = settle
        if (recorder.state !== 'inactive') recorder.stop()
        else settle()
      })

      releaseStream()
      setRecording(false)
      setLiveElapsed(0)
      stopRecognition()

      const duration = Math.max(1, elapsedSecondsSince(startedAtRef.current))
      if (blob.size < 200) {
        setError(reason === 'quota' ? QUOTA_TOO_SHORT_AT_CAP : 'That recording was too short. Try again.')
        finishingRef.current = false
        return
      }

      if (reason === 'quota') setStatus(QUOTA_STOPPED)
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
        setStatus(null)
        setError(caught instanceof Error ? caught.message : 'Could not process that recording.')
      } finally {
        setBusy(false)
        finishingRef.current = false
      }
    },
    [getToken, navigate, onSaved, process, setLiveElapsed],
  )

  finishRef.current = finishRecording

  const checkCap = useCallback(() => {
    if (!recordingRef.current || finishingRef.current) return
    const next = elapsedSecondsSince(startedAtRef.current)
    setElapsed(next)
    setLiveElapsed(next)
    if (shouldStopForQuota(next, remainingRef.current)) {
      void finishRef.current('quota')
    }
  }, [setLiveElapsed])

  useEffect(() => {
    if (!recording) return

    const remaining = remainingRef.current
    if (remaining != null && remaining <= 0) {
      void finishRef.current('quota')
    }

    const interval = window.setInterval(checkCap, 250)
    const timeout =
      remaining != null && remaining > 0
        ? window.setTimeout(() => void finishRef.current('quota'), remaining * 1000)
        : undefined

    const onVisibility = () => {
      checkCap()
    }
    const onLeave = () => {
      const next = elapsedSecondsSince(startedAtRef.current)
      void finishRef.current(shouldStopForQuota(next, remainingRef.current) ? 'quota' : 'leave')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onLeave)

    return () => {
      window.clearInterval(interval)
      if (timeout != null) window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onLeave)
    }
  }, [checkCap, recording])

  const onToggle = async () => {
    if (busy) return
    if (!isSignedIn) {
      openSignIn({ forceRedirectUrl: '/' })
      return
    }
    if (!recording && remainingSeconds != null && remainingSeconds <= 0) {
      setError(QUOTA_REACHED)
      return
    }
    try {
      if (recording) {
        await finishRecording('user')
      } else {
        await startRecording()
      }
    } catch (caught) {
      setRecording(false)
      releaseStream()
      setLiveElapsed(0)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Microphone access is required to record notes.',
      )
    }
  }

  useEffect(() => {
    return () => {
      if (recordingRef.current && elapsedSecondsSince(startedAtRef.current) >= 1) {
        void finishRef.current('leave')
        return
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      stopRecognition()
    }
  }, [])

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')
  const showPreview = recording || busy || Boolean(preview)
  const remainingNow = displayRemaining ?? remainingSeconds
  const outOfTime = remainingNow != null && remainingNow <= 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4">
      <p className="text-[15px] tracking-wide text-nota-muted">
        {busy
          ? 'Transcribing…'
          : recording
            ? `${minutes}:${seconds}`
            : outOfTime
              ? 'No recording time left'
              : 'Tap to record'}
      </p>
      <div className="mt-6 p-8">
        <RecordButton
          recording={recording}
          busy={busy}
          disabled={!recording && outOfTime}
          onClick={() => void onToggle()}
        />
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
      {status ? (
        <p className="mt-6 max-w-sm text-center text-sm text-nota-ink">{status}</p>
      ) : null}
      {error ? (
        <p className="mt-6 max-w-sm text-center text-sm text-nota-terracotta">{error}</p>
      ) : null}
    </div>
  )
}
