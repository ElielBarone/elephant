export const idiomValues = ['ptBR', 'enUS', 'enGB', 'itIT'] as const
export type Idiom = (typeof idiomValues)[number]

export interface Phrase {
  id: string
  original: string
  translated: string
}

export interface Deck {
  id: string
  title: string
  nativeIdiom: Idiom
  learningIdiom: Idiom
  phrases: Phrase[]
  createdAt: string
  updatedAt: string
  sourceAsset?: string
  ttsPromptEnabled?: boolean
  ttsAnswerEnabled?: boolean
}

export type StudyPhase = 'learning' | 'review' | 'relearning'

export interface CardSchedule {
  deckId: string
  cardId: string
  phase: StudyPhase
  ease: number
  intervalDays: number
  repetitions: number
  lapses: number
  learningStage: number
  due: number
  intervalBeforeLapse: number | null
}

export type Rating = 'hard' | 'good' | 'easy'
