import type { CardSchedule, Rating } from '@/types/models'

export const MIN_EASE = 1.3

const MS_HOUR = 60 * 60 * 1000
const MS_DAY = 24 * MS_HOUR

export const LEARNING_STEP_MS = [1 * MS_HOUR, 8 * MS_HOUR, 1 * MS_DAY] as const

export const GRADUATE_LEARNING_STAGE = 3

export function qualityFromRating(rating: Rating): number {
  switch (rating) {
    case 'hard':
      return 3
    case 'good':
      return 4
    case 'easy':
      return 5
    default:
      return 4
  }
}

export function nextEase(current: number, q: number): number {
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  return Math.max(MIN_EASE, current + delta)
}

export function createInitialSchedule(
  deckId: string,
  cardId: string,
  now: number,
): CardSchedule {
  return {
    deckId,
    cardId,
    phase: 'learning',
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    learningStage: 0,
    due: now,
    intervalBeforeLapse: null,
  }
}

function advanceLearningStage(
  stage: number,
  rating: Rating,
): number {
  if (rating === 'hard') {
    return 0
  }
  const jump = rating === 'easy' ? 2 : 1
  return Math.min(GRADUATE_LEARNING_STAGE, stage + jump)
}

function learningDelayMsForTransition(toStage: number): number {
  if (toStage >= GRADUATE_LEARNING_STAGE) {
    return 0
  }
  const index = Math.min(toStage - 1, LEARNING_STEP_MS.length - 1)
  if (index < 0) {
    return LEARNING_STEP_MS[0]
  }
  return LEARNING_STEP_MS[index]
}

function applyLearningOrRelearning(
  state: CardSchedule,
  rating: Rating,
  now: number,
  nextPhaseAfterGraduate: 'review',
): CardSchedule {
  if (rating === 'hard') {
    return {
      ...state,
      learningStage: 0,
      due: now + LEARNING_STEP_MS[0],
    }
  }

  const prevStage = state.learningStage
  const nextStage = advanceLearningStage(prevStage, rating)

  if (prevStage >= GRADUATE_LEARNING_STAGE) {
    const baseInterval =
      state.phase === 'relearning' && state.intervalBeforeLapse != null
        ? Math.max(1, state.intervalBeforeLapse * 0.35)
        : 1
    return {
      ...state,
      phase: nextPhaseAfterGraduate,
      learningStage: 0,
      intervalDays: baseInterval,
      repetitions: state.repetitions + 1,
      due: now + baseInterval * MS_DAY,
      intervalBeforeLapse: null,
      ease: state.ease,
    }
  }

  if (nextStage >= GRADUATE_LEARNING_STAGE) {
    return {
      ...state,
      learningStage: GRADUATE_LEARNING_STAGE,
      due: now + LEARNING_STEP_MS[LEARNING_STEP_MS.length - 1],
    }
  }

  const delay = learningDelayMsForTransition(nextStage)
  return {
    ...state,
    learningStage: nextStage,
    due: now + delay,
  }
}

function applyReview(
  state: CardSchedule,
  rating: Rating,
  now: number,
): CardSchedule {
  const q = qualityFromRating(rating)
  const previousEase = state.ease
  const ease = nextEase(previousEase, q)

  if (rating === 'hard') {
    return {
      ...state,
      ease,
      lapses: state.lapses + 1,
      phase: 'relearning',
      learningStage: 0,
      intervalBeforeLapse: state.intervalDays,
      due: now + LEARNING_STEP_MS[0],
    }
  }

  const interval =
    rating === 'easy'
      ? state.intervalDays * previousEase * 1.3
      : state.intervalDays * previousEase

  return {
    ...state,
    ease,
    phase: 'review',
    intervalDays: interval,
    repetitions: state.repetitions + 1,
    due: now + interval * MS_DAY,
  }
}

export function applyRating(
  state: CardSchedule,
  rating: Rating,
  now: number,
): CardSchedule {
  if (state.phase === 'learning') {
    return applyLearningOrRelearning(state, rating, now, 'review')
  }
  if (state.phase === 'relearning') {
    return applyLearningOrRelearning(state, rating, now, 'review')
  }
  return applyReview(state, rating, now)
}

export function isDue(schedule: CardSchedule, now: number): boolean {
  return schedule.due <= now
}

export function sortDueFirst(a: CardSchedule, b: CardSchedule, now: number): number {
  const ad = isDue(a, now) ? 0 : 1
  const bd = isDue(b, now) ? 0 : 1
  if (ad !== bd) {
    return ad - bd
  }
  return a.due - b.due
}
