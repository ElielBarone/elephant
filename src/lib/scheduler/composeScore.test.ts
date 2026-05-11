import { describe, expect, it } from 'vitest'
import {
  COMPOSE_ACCEPT_THRESHOLD,
  COMPOSE_EASY_THRESHOLD,
  computeComposeScore,
  pickRandomHiddenWordIndex,
  ratingForPercentage,
} from './composeScore'

describe('ratingForPercentage', () => {
  it('returns hard below the accept threshold', () => {
    expect(ratingForPercentage(COMPOSE_ACCEPT_THRESHOLD - 0.01)).toBe('hard')
    expect(ratingForPercentage(0)).toBe('hard')
  })

  it('returns good at the accept threshold', () => {
    expect(ratingForPercentage(COMPOSE_ACCEPT_THRESHOLD)).toBe('good')
    expect(ratingForPercentage(COMPOSE_EASY_THRESHOLD - 0.01)).toBe('good')
  })

  it('returns easy at or above the easy threshold', () => {
    expect(ratingForPercentage(COMPOSE_EASY_THRESHOLD)).toBe('easy')
    expect(ratingForPercentage(100)).toBe('easy')
  })
})

describe('computeComposeScore', () => {
  it('marks every word correct when the attempt matches exactly', () => {
    const score = computeComposeScore(
      'andare a letto presto',
      'andare a letto presto',
      new Set(),
      { submitted: true },
    )
    expect(score.totalCount).toBe(4)
    expect(score.correctCount).toBe(4)
    expect(score.percentage).toBe(100)
    expect(score.accepted).toBe(true)
    expect(score.rating).toBe('easy')
    expect(score.wordStates).toEqual(['correct', 'correct', 'correct', 'correct'])
  })

  it('marks unmatched words as hidden before submission', () => {
    const score = computeComposeScore(
      'andare a letto presto',
      'andare',
      new Set(),
      { submitted: false },
    )
    expect(score.wordStates[0]).toBe('correct')
    expect(score.wordStates.slice(1)).toEqual(['hidden', 'hidden', 'hidden'])
  })

  it('marks unmatched words as missed after submission', () => {
    const score = computeComposeScore(
      'andare a letto presto',
      'andare',
      new Set(),
      { submitted: true },
    )
    expect(score.wordStates).toEqual(['correct', 'missed', 'missed', 'missed'])
    expect(score.correctCount).toBe(1)
    expect(score.percentage).toBe(25)
    expect(score.accepted).toBe(false)
    expect(score.rating).toBe('hard')
  })

  it('treats tip-revealed words as wrong toward the score', () => {
    const score = computeComposeScore(
      'andare a letto presto',
      'andare letto presto',
      new Set([1]),
      { submitted: true },
    )
    expect(score.wordStates).toEqual(['correct', 'tipRevealed', 'correct', 'correct'])
    expect(score.correctCount).toBe(3)
    expect(score.percentage).toBe(75)
    expect(score.accepted).toBe(false)
    expect(score.rating).toBe('hard')
  })

  it('accepts at 80% (good)', () => {
    const score = computeComposeScore(
      'a b c d e',
      'a b c d',
      new Set(),
      { submitted: true },
    )
    expect(score.percentage).toBe(80)
    expect(score.accepted).toBe(true)
    expect(score.rating).toBe('good')
  })

  it('handles an empty expected phrase', () => {
    const score = computeComposeScore('', '', new Set(), { submitted: true })
    expect(score.totalCount).toBe(0)
    expect(score.percentage).toBe(0)
    expect(score.rating).toBe('hard')
    expect(score.accepted).toBe(false)
  })
})

describe('pickRandomHiddenWordIndex', () => {
  it('returns null when no words are hidden', () => {
    expect(pickRandomHiddenWordIndex(['correct', 'tipRevealed'])).toBeNull()
  })

  it('picks an index that is currently hidden', () => {
    const states = ['correct', 'hidden', 'tipRevealed', 'hidden'] as const
    const picked = pickRandomHiddenWordIndex([...states], () => 0)
    expect(picked).toBe(1)
    const pickedLast = pickRandomHiddenWordIndex([...states], () => 0.999)
    expect(pickedLast).toBe(3)
  })
})
