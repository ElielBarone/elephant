import Box from '@mui/material/Box'
import { idiomFlagUrl, idiomLabel } from '@/lib/idiom'
import type { Idiom } from '@/types/models'

interface IdiomFlagProps {
  idiom: Idiom
  height?: number
  decorative?: boolean
}

export function IdiomFlag({ idiom, height = 20, decorative = false }: IdiomFlagProps) {
  const width = Math.round((height * 4) / 3)
  return (
    <Box
      component="img"
      src={idiomFlagUrl(idiom)}
      alt={decorative ? '' : idiomLabel(idiom)}
      title={idiomLabel(idiom)}
      sx={{
        width,
        height,
        display: 'inline-block',
        objectFit: 'cover',
        borderRadius: 0.5,
        verticalAlign: 'middle',
        boxShadow: 1,
        flexShrink: 0,
      }}
    />
  )
}
