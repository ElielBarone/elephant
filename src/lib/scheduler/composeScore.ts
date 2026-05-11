import { matchPhraseWords } from '@/lib/voice/speechRecognition'
import type { Rating } from '@/types/models'

export type ComposeWordState = 'correct' | 'missed' | 'tipRevealed' | 'hidden'

export interface ComposeScore {
  wordStates: ComposeWordState[]
  correctCount: number
  totalCount: number
  percentage: number
  accepted: boolean
  rating: Rating
}

export interface ComposeScoreOptions {
  submitted?: boolean
}

export const COMPOSE_ACCEPT_THRESHOLD = 80
export const COMPOSE_EASY_THRESHOLD = 95

export function countPhraseWords(expected: string): number {
  return expected.split(/\s+/).filter(Boolean).length
}

export function ratingForPercentage(percentage: number): Rating {
  if (percentage >= COMPOSE_EASY_THRESHOLD) {
    return 'easy'
  }
  if (percentage >= COMPOSE_ACCEPT_THRESHOLD) {
    return 'good'
  }
  return 'hard'
}

export function computeComposeScore(
  expected: string,
  attempt: string,
  tipRevealedIndices: ReadonlySet<number>,
  options: ComposeScoreOptions = {},
): ComposeScore {
  const matched = matchPhraseWords(expected, attempt)
  const totalCount = matched.length
  const submitted = options.submitted ?? false

  const wordStates: ComposeWordState[] = matched.map((isMatch, index) => {
    if (tipRevealedIndices.has(index)) {
      return 'tipRevealed'
    }
    if (isMatch) {
      return 'correct'
    }
    return submitted ? 'missed' : 'hidden'
  })

  const correctCount = wordStates.reduce(
    (acc, state) => (state === 'correct' ? acc + 1 : acc),
    0,
  )

  const percentage = totalCount === 0 ? 0 : (correctCount / totalCount) * 100
  const accepted = percentage >= COMPOSE_ACCEPT_THRESHOLD
  const rating = ratingForPercentage(percentage)

  return {
    wordStates,
    correctCount,
    totalCount,
    percentage,
    accepted,
    rating,
  }
}

export function pickRandomHiddenWordIndex(
  wordStates: ComposeWordState[],
  random: () => number = Math.random,
): number | null {
  const hiddenIndices: number[] = []
  for (let i = 0; i < wordStates.length; i += 1) {
    if (wordStates[i] === 'hidden') {
      hiddenIndices.push(i)
    }
  }
  if (hiddenIndices.length === 0) {
    return null
  }
  const choice = Math.floor(random() * hiddenIndices.length)
  return hiddenIndices[Math.min(choice, hiddenIndices.length - 1)]
}
