type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

type SpeechRecognitionResultItem = {
  [index: number]: SpeechRecognitionAlternative
  length: number
  isFinal: boolean
}

type SpeechRecognitionResultList = {
  [index: number]: SpeechRecognitionResultItem
  length: number
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export interface SpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  onStart?: () => void
  onResult?: (transcript: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

export interface SpeechRecognizer {
  isSupported: boolean
  start: () => void
  stop: () => void
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition
}

function getTranscript(event: SpeechRecognitionEvent): string {
  const parts: string[] = []

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i]
    if (!result) {
      continue
    }

    if (result[0] && typeof result[0].transcript === 'string') {
      parts.push(result[0].transcript)
    }
  }

  return parts.join(' ').trim()
}

export function createSpeechRecognizer(options: SpeechRecognitionOptions = {}): SpeechRecognizer {
  const Recognizer = getSpeechRecognitionConstructor()

  if (!Recognizer) {
    return {
      isSupported: false,
      start: () => {},
      stop: () => {},
    }
  }

  const recognition = new Recognizer()
  recognition.lang = options.lang ?? 'en-US'
  recognition.continuous = options.continuous ?? false
  recognition.interimResults = options.interimResults ?? false
  recognition.maxAlternatives = options.maxAlternatives ?? 1

  recognition.onstart = () => {
    options.onStart?.()
  }

  recognition.onresult = (event) => {
    const transcript = getTranscript(event)
    if (transcript) {
      options.onResult?.(transcript)
    }
  }

  recognition.onerror = () => {
    options.onError?.('Speech recognition failed. Please try again.')
  }

  recognition.onend = () => {
    options.onEnd?.()
  }

  return {
    isSupported: true,
    start: () => {
      recognition.start()
    },
    stop: () => {
      recognition.stop()
    },
  }
}

function normalizePhrase(text: string): string {
  return text
    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[b.length][a.length]
}

export function arePhrasesSimilar(expected: string, spoken: string, threshold = 0.72): boolean {
  const normalizedExpected = normalizePhrase(expected)
  const normalizedSpoken = normalizePhrase(spoken)

  if (!normalizedExpected || !normalizedSpoken) {
    return false
  }

  const distance = levenshteinDistance(normalizedExpected, normalizedSpoken)
  const maxLength = Math.max(normalizedExpected.length, normalizedSpoken.length)

  if (maxLength === 0) {
    return false
  }

  const similarity = 1 - distance / maxLength
  return similarity >= threshold
}
