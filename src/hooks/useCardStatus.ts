import { CardPhase } from '@/lib/scheduler/cardFlow'

interface GetCardStatusProps {
  speechError: string | null
  speechSupported: boolean | null
  ttsPlaying: boolean
  listening: boolean
  currentPhase: CardPhase
  flipped: boolean
}

interface CardStatus {
  statusText: string
  isOrigin: boolean
  phase: CardPhase
}

const phaseMessages: Partial<Record<CardPhase, string>> = {
  [CardPhase.ListenFront]: 'Tap the microphone to try again.',
  [CardPhase.ShowBack]: 'Translation shown.',
  [CardPhase.AwaitRating]: 'Rate the card.',
}

export function getCardStatus({
  speechError,
  speechSupported,
  ttsPlaying,
  listening,
  currentPhase,
  flipped,
}: GetCardStatusProps): CardStatus {
  let statusText: string

  if (speechError) {
    statusText = speechError
  } else if (speechSupported === false) {
    statusText = 'Speech recognition not available. Tap to flip manually.'
  } else if (ttsPlaying) {
    statusText = 'Reproducing audio…'
  } else if (listening) {
    statusText = 'Listening for your pronunciation…'
  } else if (phaseMessages[currentPhase]) {
    statusText = phaseMessages[currentPhase]!
  } else {
    statusText = 'Speak the prompt aloud to flip the card.'
  }

  return {
    statusText,
    isOrigin: !flipped,
    phase: currentPhase,
  }
}