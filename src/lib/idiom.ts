import type { Idiom } from '@/types/models'

const bcp47: Record<Idiom, string> = {
  ptBR: 'pt-BR',
  enUS: 'en-US',
  enGB: 'en-GB',
  itIT: 'it-IT',
}

export function idiomToBcp47(idiom: Idiom): string {
  return bcp47[idiom]
}

export function idiomLabel(idiom: Idiom): string {
  switch (idiom) {
    case 'ptBR':
      return 'Portuguese (Brazil)'
    case 'enUS':
      return 'English (US)'
    case 'enGB':
      return 'English (UK)'
    case 'itIT':
      return 'Italian'
    default:
      return idiom
  }
}
