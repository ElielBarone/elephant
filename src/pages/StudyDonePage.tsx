import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { mascotReactionImage } from '@/components/MascotReactions'

export function StudyDonePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Box
      role="presentation"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'radial-gradient(ellipse 120% 80% at 50% 60%, #1a1240 0%, #070510 55%, #040308 100%)',
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ width: '100%', maxWidth: 420 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.02,
            color: 'rgba(255, 255, 255, 0.92)',
            textAlign: 'center',
          }}
        >
          {t('study.congratulationsTitle')}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(230, 220, 255, 0.75)', textAlign: 'center' }}
        >
          {t('study.congratulationsMessage')}
        </Typography>
        <Box
          component="img"
          src={mascotReactionImage('well-done')}
          alt="Elephant mascot"
          sx={{
            width: 'min(72vw, 320px)',
            height: 'auto',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        <Button variant="contained" fullWidth onClick={() => navigate('/')}>
          {t('study.backToDecks')}
        </Button>
      </Stack>
    </Box>
  )
}
