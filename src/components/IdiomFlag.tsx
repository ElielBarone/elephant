import Box from '@mui/material/Box'
import { idiomFlagUrl, idiomLabel } from '@/lib/idiom'
import type { Idiom } from '@/types/models'
import { useTheme, type SxProps, type Theme } from '@mui/material'


interface IdiomFlagProps {
  idiom: Idiom
  height?: number
  decorative?: boolean
  sx?: SxProps<Theme>
}

export function IdiomFlag({ idiom, height = 20, decorative = false, sx }: IdiomFlagProps) {
  const width = Math.round((height * 4) / 3);
  const theme = useTheme();
  
  return (
    <Box
      component="img"
      src={idiomFlagUrl(idiom)}
      alt={decorative ? '' : idiomLabel(idiom)}
      title={idiomLabel(idiom)}
      sx={{
        width,
        height,
        border: `2px solid ${theme.palette.background.paper}`,
        objectFit: 'cover',
        borderRadius: 0.4,
        verticalAlign: 'middle',        
        flexShrink: 0,
        backgroundColor: 'white',
        ...sx,
      }}
    />
  )
}
