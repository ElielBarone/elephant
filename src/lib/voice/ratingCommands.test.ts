import { describe, expect, it } from 'vitest'
import { getRatingFromTranscript } from './ratingCommands'

describe('getRatingFromTranscript', () => {
  it('recognizes hard from exact hard', () => {
    expect(getRatingFromTranscript('hard')).toBe('hard')
  })

  it('recognizes hard from heart', () => {
    expect(getRatingFromTranscript('heart')).toBe('hard')
  })

  it('recognizes hard from heard', () => {
    expect(getRatingFromTranscript('heard')).toBe('hard')
  })

  it('recognizes hard in filler phrase', () => {
    expect(getRatingFromTranscript('i think it was hard')).toBe('hard')
  })

  it('recognizes good from exact good', () => {
    expect(getRatingFromTranscript('good')).toBe('good')
  })

  it('does not misclassify food as good', () => {
    expect(getRatingFromTranscript('food')).toBeNull()
  })
})
