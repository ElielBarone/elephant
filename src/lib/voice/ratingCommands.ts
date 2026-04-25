import type { Idiom } from '@/types/models'

export type RatingCommand = 'hard' | 'good' | 'easy'

export const ratingCommands: Record<Idiom, Record<RatingCommand, string[]>> = {
  enUS: {
    hard: ['hard', 'difficult', 'tough', 'challenging'],
    good: ['good', 'okay', 'alright', 'fine', 'average'],
    easy: ['easy', 'simple', 'straightforward', 'piece of cake'],
  },
  enGB: {
    hard: ['hard', 'difficult', 'tough', 'challenging'],
    good: ['good', 'okay', 'alright', 'fine', 'average'],
    easy: ['easy', 'simple', 'straightforward', 'piece of cake'],
  },
  ptBR: {
    hard: ['difícil', 'duro', 'árduo', 'desafiador', 'complicado'],
    good: ['bom', 'ok', 'tá bom', 'tá bom', 'médio', 'regular'],
    easy: ['fácil', 'simples', 'tranquilo', 'moleza'],
  },
  itIT: {
    hard: ['difficile', 'duro', 'arduo', 'sfidante', 'complicato'],
    good: ['buono', 'ok', 'va bene', 'medio', 'regolare'],
    easy: ['facile', 'semplice', 'tranquillo', 'una passeggiata'],
  },
}

export function getRatingFromTranscript(
  transcript: string,
  idiom: Idiom,
): RatingCommand | null {
  const normalizedTranscript = transcript.toLowerCase().trim()
  const commands = ratingCommands[idiom]

  for (const [rating, phrases] of Object.entries(commands)) {
    for (const phrase of phrases) {
      if (normalizedTranscript.includes(phrase.toLowerCase())) {
        return rating as RatingCommand
      }
    }
  }

  return null
}