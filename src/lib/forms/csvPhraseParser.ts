import { nanoid } from 'nanoid'
import type { Phrase } from '@/types/models'

export interface ParseResult {
  phrases: Phrase[]
  duplicateCount: number
  error?: string
}

/**
 * Parses CSV content with semicolon separator
 * Format: original phrase ; translated phrase
 * Returns parsed phrases, duplicate count, and any validation error
 */
export function parseCsvPhrases(
  text: string,
  existingPhrases: Phrase[] = [],
): ParseResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return {
      phrases: [],
      duplicateCount: 0,
      error: 'No phrases found in input',
    }
  }

  const phrases: Phrase[] = []
  const existingOriginals = new Set(existingPhrases.map((p) => p.original.toLowerCase()))
  let duplicateCount = 0

  for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
    const line = lines[lineNum - 1]
    const parts = line.split(';').map((part) => part.trim())

    // Validate format: exactly 2 parts
    if (parts.length !== 2) {
      return {
        phrases: [],
        duplicateCount: 0,
        error: `Line ${lineNum}: Invalid format. Expected "original ; translated" but got ${parts.length} parts`,
      }
    }

    const [original, translated] = parts

    // Validate non-empty fields
    if (original.length === 0) {
      return {
        phrases: [],
        duplicateCount: 0,
        error: `Line ${lineNum}: Original phrase cannot be empty`,
      }
    }

    if (translated.length === 0) {
      return {
        phrases: [],
        duplicateCount: 0,
        error: `Line ${lineNum}: Translated phrase cannot be empty`,
      }
    }

    // Validate max length
    if (original.length > 500) {
      return {
        phrases: [],
        duplicateCount: 0,
        error: `Line ${lineNum}: Original phrase exceeds 500 characters`,
      }
    }

    if (translated.length > 500) {
      return {
        phrases: [],
        duplicateCount: 0,
        error: `Line ${lineNum}: Translated phrase exceeds 500 characters`,
      }
    }

    // Check for duplicates
    if (existingOriginals.has(original.toLowerCase())) {
      duplicateCount++
      continue
    }

    phrases.push({
      id: nanoid(),
      original,
      translated,
    })
  }

  return {
    phrases,
    duplicateCount,
  }
}
