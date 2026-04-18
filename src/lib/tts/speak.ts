import { idiomToBcp47 } from '@/lib/idiom'
import type { Idiom } from '@/types/models'

export function speakWithIdiom(text: string, idiom: Idiom): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = idiomToBcp47(idiom)
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
