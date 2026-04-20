import { idiomToBcp47 } from '@/lib/idiom'
import type { Idiom } from '@/types/models'

export function speakWithIdiom(text: string, idiom: Idiom, options?: { pitch?: number, rate?: number, volume?: number }): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = idiomToBcp47(idiom)
  if (options) {
    utterance.pitch = options.pitch || 1        
  }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
