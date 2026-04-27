import { idiomToBcp47 } from '@/lib/idiom'
import type { Idiom } from '@/types/models'

export function speakWithIdiom(text: string, idiom: Idiom, options?: { pitch?: number, rate?: number, volume?: number }): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = idiomToBcp47(idiom)
    if (options) {
      utterance.pitch = options.pitch ?? 1
      if (typeof options.rate === 'number') {
        utterance.rate = options.rate
      }
      if (typeof options.volume === 'number') {
        utterance.volume = options.volume
      }
    }

    utterance.onend = () => {
      resolve()
    }
    utterance.onerror = () => {
      resolve()
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })
}
