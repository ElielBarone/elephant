import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

export interface FlipCardProps {
  frontTitle: string
  backTitle: string
  frontText: string
  backText: string
  flipped: boolean
  onToggle: () => void
}

export function FlipCard({
  frontTitle,
  backTitle,
  frontText,
  backText,
  flipped,
  onToggle,
}: FlipCardProps) {
  return (
    <Box
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      aria-label="Flip card"
      sx={{
        perspective: 1200,
        width: '100%',
        height: '100%',
        flex: 1,
        minWidth: 0,
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          flex: 1,
          minHeight: 0,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <Paper
             
          sx={{
            position: 'absolute',
            inset: 0,
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backfaceVisibility: 'hidden',
            borderRadius: 3,
          }}
        >
          <Typography variant="overline" color="text.secondary">
            {frontTitle}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, wordBreak: 'break-word' }}>
            {frontText}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            Tap to reveal translation
          </Typography>
        </Paper>
        <Paper
          
          sx={{
            position: 'absolute',
            inset: 0,
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            borderRadius: 3,
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            {backTitle}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, wordBreak: 'break-word' }}>
            {backText}
          </Typography>
          <Typography variant="caption" sx={{ mt: 2, color: 'rgba(255,255,255,0.72)' }}>
            Tap to show prompt
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
