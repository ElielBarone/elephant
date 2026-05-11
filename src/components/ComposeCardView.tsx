import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

export interface ComposeCardViewProps {
  title: string
  translation: string
  answerLabel?: string
  answer?: ReactNode
  answerMeta?: ReactNode
  extra?: ReactNode
}

export function ComposeCardView({
  title,
  translation,
  answerLabel,
  answer,
  answerMeta,
  extra,
}: ComposeCardViewProps) {
  return (
    <Box
      sx={{
        width: '100%',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          borderRadius: 3,
          bgcolor: 'primary.dark',
          color: 'primary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{ mt: 1, wordBreak: 'break-word', textAlign: 'center' }}
          >
            {translation}
          </Typography>
        </Box>
        {answer ? (
          <Box
            sx={{
              width: '100%',
              borderRadius: 2,
              px: 2,
              py: 1.5,              
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {answerLabel ? (
              <Typography
                variant="overline"
                sx={{ color: 'rgba(255,255,255,0.72)', alignSelf: 'center' }}
              >
                {answerLabel}
              </Typography>
            ) : null}
            {answer}
            {answerMeta ? (
              <Box sx={{ alignSelf: 'center', mt: 0.5 }}>{answerMeta}</Box>
            ) : null}
          </Box>
        ) : null}
        {extra}
      </Paper>
    </Box>
  )
}
