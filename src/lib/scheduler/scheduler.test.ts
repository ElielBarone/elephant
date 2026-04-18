import { describe, expect, it } from 'vitest'
import type { CardSchedule } from '@/types/models'
import {
  LEARNING_STEP_MS,
  MIN_EASE,
  applyRating,
  createInitialSchedule,
  nextEase,
  qualityFromRating,
  sortDueFirst,
} from './scheduler'

const now = 1_700_000_000_000

function learnThrough(
  start: CardSchedule,
  ratings: Array<'good' | 'hard' | 'easy'>,
): CardSchedule {
  let s = start
  let t = now
  for (const r of ratings) {
    s = applyRating(s, r, t)
    t = s.due
  }
  return s
}

describe('qualityFromRating', () => {
  it('maps Hard to 3', () => {
    expect(qualityFromRating('hard')).toBe(3)
  })
  it('maps Good to 4', () => {
    expect(qualityFromRating('good')).toBe(4)
  })
  it('maps Easy to 5', () => {
    expect(qualityFromRating('easy')).toBe(5)
  })
})

describe('nextEase', () => {
  it('does not go below the minimum cap', () => {
    let ef = 1.3
    for (let i = 0; i < 20; i += 1) {
      ef = nextEase(ef, 3)
    }
    expect(ef).toBeGreaterThanOrEqual(MIN_EASE)
    expect(ef).toBe(MIN_EASE)
  })

  it('increases for Easy and is flat for Good at 2.5', () => {
    expect(nextEase(2.5, 5)).toBeGreaterThan(2.5)
    expect(nextEase(2.5, 4)).toBe(2.5)
  })
})

describe('learning graduation', () => {
  it('reaches review after the final learning success', () => {
    const initial = createInitialSchedule('d1', 'c1', now)
    const s = learnThrough(initial, ['good', 'good', 'good', 'good'])
    expect(s.phase).toBe('review')
    expect(s.learningStage).toBe(0)
    expect(s.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('schedules hour then eight hours while learning', () => {
    const first = applyRating(createInitialSchedule('d1', 'c1', now), 'good', now)
    expect(first.due - now).toBe(LEARNING_STEP_MS[0])
    const second = applyRating(first, 'good', first.due)
    expect(second.due - first.due).toBe(LEARNING_STEP_MS[1])
  })

  it('resets learning on Hard', () => {
    let s = createInitialSchedule('d1', 'c1', now)
    s = applyRating(s, 'good', now)
    const reviewTime = s.due
    s = applyRating(s, 'hard', reviewTime)
    expect(s.learningStage).toBe(0)
    expect(s.due - reviewTime).toBe(LEARNING_STEP_MS[0])
  })
})

describe('review and lapses', () => {
  it('moves mature review cards into relearning on Hard', () => {
    const review: CardSchedule = {
      deckId: 'd1',
      cardId: 'c1',
      phase: 'review',
      ease: 2.5,
      intervalDays: 4,
      repetitions: 3,
      lapses: 0,
      learningStage: 0,
      due: now,
      intervalBeforeLapse: null,
    }
    const next = applyRating(review, 'hard', now)
    expect(next.phase).toBe('relearning')
    expect(next.lapses).toBe(1)
    expect(next.intervalBeforeLapse).toBe(4)
    expect(next.ease).toBeLessThan(review.ease)
  })

  it('grows interval on Good using the previous ease', () => {
    const review: CardSchedule = {
      deckId: 'd1',
      cardId: 'c1',
      phase: 'review',
      ease: 2.5,
      intervalDays: 2,
      repetitions: 1,
      lapses: 0,
      learningStage: 0,
      due: now,
      intervalBeforeLapse: null,
    }
    const next = applyRating(review, 'good', now)
    expect(next.intervalDays).toBe(5)
    expect(next.repetitions).toBe(2)
  })

  it('applies a larger multiplier on Easy', () => {
    const review: CardSchedule = {
      deckId: 'd1',
      cardId: 'c1',
      phase: 'review',
      ease: 2.5,
      intervalDays: 2,
      repetitions: 1,
      lapses: 0,
      learningStage: 0,
      due: now,
      intervalBeforeLapse: null,
    }
    const good = applyRating(review, 'good', now)
    const easy = applyRating(review, 'easy', now)
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays)
  })
})

describe('sortDueFirst', () => {
  it('orders due cards before future cards', () => {
    const a: CardSchedule = {
      deckId: 'd',
      cardId: 'a',
      phase: 'review',
      ease: 2.5,
      intervalDays: 1,
      repetitions: 1,
      lapses: 0,
      learningStage: 0,
      due: now + 1,
      intervalBeforeLapse: null,
    }
    const b: CardSchedule = {
      deckId: 'd',
      cardId: 'b',
      phase: 'review',
      ease: 2.5,
      intervalDays: 1,
      repetitions: 1,
      lapses: 0,
      learningStage: 0,
      due: now - 1,
      intervalBeforeLapse: null,
    }
    const sorted = [a, b].sort((x, y) => sortDueFirst(x, y, now))
    expect(sorted[0].cardId).toBe('b')
  })
})

describe('relearning graduation', () => {
  it('restores review with a shorter interval than before lapse', () => {
    let s: CardSchedule = {
      deckId: 'd1',
      cardId: 'c1',
      phase: 'review',
      ease: 2.5,
      intervalDays: 10,
      repetitions: 4,
      lapses: 0,
      learningStage: 0,
      due: now,
      intervalBeforeLapse: null,
    }
    s = applyRating(s, 'hard', now)
    expect(s.phase).toBe('relearning')
    s = learnThrough(s, ['good', 'good', 'good', 'good'])
    expect(s.phase).toBe('review')
    expect(s.intervalDays).toBeLessThanOrEqual(10 * 0.35 + 0.001)
    expect(s.intervalBeforeLapse).toBeNull()
  })
})
