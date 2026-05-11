import type { Deck } from '@/types/models'

export const CardPhase = {
  ShowFront: 'showFront',
  PlayFrontTts: 'playFrontTts',
  ListenFront: 'listenFront',
  ShowBack: 'showBack',
  PlayBackTts: 'playBackTts',
  AwaitRating: 'awaitRating',
} as const

export type CardPhase = typeof CardPhase[keyof typeof CardPhase]

export interface CardFlowConfig {
  front: CardPhase[]
  back: CardPhase[]
}

export function buildCardFlowConfig(deck: Deck): CardFlowConfig {
  const front: CardPhase[] = [CardPhase.ShowFront]
  if (deck.ttsPromptEnabled !== false) {
    front.push(CardPhase.PlayFrontTts)
  }
  if (deck.voiceAutoFlipEnabled !== false) {
    front.push(CardPhase.ListenFront)
  }

  const back: CardPhase[] = [CardPhase.ShowBack]
  if (deck.ttsAnswerEnabled !== false) {
    back.push(CardPhase.PlayBackTts)
  }
  back.push(CardPhase.AwaitRating)

  return { front, back }
}

export const ComposePhase = {
  PlayTranslationTts: 'playTranslationTts',
  ListenAnswer: 'listenAnswer',
  AwaitInput: 'awaitInput',
} as const

export type ComposePhase = typeof ComposePhase[keyof typeof ComposePhase]

export function buildComposeFlowConfig(deck: Deck): ComposePhase[] {
  const phases: ComposePhase[] = []
  if (deck.ttsAnswerEnabled !== false) {
    phases.push(ComposePhase.PlayTranslationTts)
  }
  if (deck.voiceAutoFlipEnabled !== false) {
    phases.push(ComposePhase.ListenAnswer)
  }
  phases.push(ComposePhase.AwaitInput)
  return phases
}
