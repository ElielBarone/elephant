import type { Idiom } from '@/types/models'
import { IdiomFlag } from '@/components/IdiomFlag'

interface FlagsRelatedProps {
  firstIdiom: Idiom
  secondIdiom: Idiom
  height?: number
}

export function FlagsRelated({ firstIdiom, secondIdiom, height = 24 }: FlagsRelatedProps) {
  const marginTop = height/14;
  const marginLeft = -height/14;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IdiomFlag idiom={secondIdiom} height={height} />
      <IdiomFlag idiom={firstIdiom} height={height} sx={{ marginLeft, marginTop}} />
    </div>
  )
}
