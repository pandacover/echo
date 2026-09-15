export const WHISPER_MODEL = 'openai/whisper-large-v3-turbo'
export const CLEANUP_MODEL = 'openai/gpt-4.1-nano'

export type CleanupResult = {
  title: string
  polished: string
  dictionary: Array<{ word: string; definition: string }>
}

function toBase64(audio: ArrayBuffer): string {
  return Buffer.from(audio).toString('base64')
}

export async function transcribeAudio(params: {
  apiKey: string
  audio: ArrayBuffer
  format: string
}): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://echo.app',
      'X-Title': 'Echo',
    },
    body: JSON.stringify({
      model: WHISPER_MODEL,
      input_audio: {
        data: toBase64(params.audio),
        format: params.format,
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Transcription failed (${response.status}): ${detail.slice(0, 400)}`)
  }

  const payload = (await response.json()) as { text?: string }
  return (payload.text ?? '').trim()
}

export async function polishTranscript(params: {
  apiKey: string
  raw: string
}): Promise<CleanupResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://echo.app',
      'X-Title': 'Echo',
    },
    body: JSON.stringify({
      model: CLEANUP_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You clean voice-note transcripts. Fix grammar, punctuation, and structure without inventing facts. Return JSON only.',
        },
        {
          role: 'user',
          content: `Clean up this raw voice transcript. Return JSON with:
- title: a short title (max 8 words)
- polished: the cleaned, well-structured transcript (paragraphs allowed)
- dictionary: 0-8 notable terms (proper nouns, jargon, uncommon words) as {word, definition}

Raw transcript:
"""${params.raw}"""`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Cleanup failed (${response.status}): ${detail.slice(0, 400)}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(content) as Partial<CleanupResult>
    return {
      title: parsed.title?.trim() || 'Untitled note',
      polished: parsed.polished?.trim() || params.raw,
      dictionary: Array.isArray(parsed.dictionary)
        ? parsed.dictionary
            .filter((item) => item?.word)
            .map((item) => ({
              word: String(item.word).trim(),
              definition: String(item.definition ?? '').trim(),
            }))
            .filter(
              (item, index, all) =>
                item.word.length > 0 &&
                all.findIndex((other) => other.word.toLowerCase() === item.word.toLowerCase()) ===
                  index,
            )
        : [],
    }
  } catch {
    return { title: 'Untitled note', polished: params.raw, dictionary: [] }
  }
}

export function formatFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}
