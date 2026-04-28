import type { Deck } from '@/types/models'

export enum CardPhase {
  ShowFront = 'showFront',
  PlayFrontTts = 'playFrontTts',
  ListenFront = 'listenFront',
  ShowBack = 'showBack',
  PlayBackTts = 'playBackTts',
  AwaitRating = 'awaitRating',
}

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
