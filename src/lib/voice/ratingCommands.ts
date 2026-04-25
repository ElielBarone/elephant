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
): RatingCommand | null {
  const normalizedTranscript = transcript.toLowerCase().trim()

  // Check against ALL supported idioms
  const allIdioms: Idiom[] = ['enUS', 'enGB', 'ptBR', 'itIT']

  for (const idiom of allIdioms) {
    const commands = ratingCommands[idiom]

    // First, try exact matches or matches where the rating word is the main focus
    for (const [rating, phrases] of Object.entries(commands)) {
      for (const phrase of phrases) {
        const normalizedPhrase = phrase.toLowerCase()

        // Exact match
        if (normalizedTranscript === normalizedPhrase) {
          return rating as RatingCommand
        }

        // Match if the phrase is at the end of the transcript (likely intentional)
        if (normalizedTranscript.endsWith(normalizedPhrase)) {
          return rating as RatingCommand
        }

        // Match if the phrase is at the beginning of the transcript
        if (normalizedTranscript.startsWith(normalizedPhrase)) {
          return rating as RatingCommand
        }

        // Match if the transcript contains only the phrase plus common filler words
        const words = normalizedTranscript.split(/\s+/)
        const fillerWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'i', 'we', 'you', 'he', 'she', 'they']
        const filteredWords = words.filter(word => !fillerWords.includes(word))

        if (filteredWords.length === 1 && filteredWords[0] === normalizedPhrase) {
          return rating as RatingCommand
        }
      }
    }
  }

  return null
}