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

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const ratingAliases: Record<RatingCommand, string[]> = {
  hard: ['heart', 'heard', 'hart'],
  good: [],
  easy: [],
}

function isCommandMatch(normalizedTranscript: string, normalizedPhrase: string): boolean {
  if (normalizedTranscript === normalizedPhrase) {
    return true
  }

  if (normalizedTranscript.endsWith(normalizedPhrase) || normalizedTranscript.startsWith(normalizedPhrase)) {
    return true
  }

  return false
}

export function getRatingFromTranscript(
  transcript: string,
): RatingCommand | null {
  const normalizedTranscript = normalizeText(transcript)

  // Check against ALL supported idioms
  const allIdioms: Idiom[] = ['enUS', 'enGB', 'ptBR', 'itIT']

  for (const idiom of allIdioms) {
    const commands = ratingCommands[idiom]

    // First, try exact matches or matches where the rating word is the main focus
    for (const [rating, phrases] of Object.entries(commands)) {
      for (const phrase of phrases) {
        const normalizedPhrase = normalizeText(phrase)
        const aliasPhrases = ratingAliases[rating as RatingCommand] ?? []

        // Exact match or explicit alias match
        if (isCommandMatch(normalizedTranscript, normalizedPhrase) || aliasPhrases.includes(normalizedTranscript)) {
          return rating as RatingCommand
        }

        const words = normalizedTranscript.split(/\s+/)
        const fillerWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'i', 'we', 'you', 'he', 'she', 'they']
        const filteredWords = words.filter(word => !fillerWords.includes(word))

        if (filteredWords.length === 1 && (isCommandMatch(filteredWords[0], normalizedPhrase) || aliasPhrases.includes(filteredWords[0]))) {
          return rating as RatingCommand
        }

        if (filteredWords.some((word) => isCommandMatch(word, normalizedPhrase) || aliasPhrases.includes(word))) {
          return rating as RatingCommand
        }
      }
    }
  }

  return null
}