import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

function mascotSrc() {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}elephant-mascot.png`
}

export function WelcomeSplash() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), 2000)
    return () => window.clearTimeout(id)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <Box
      role="presentation"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 2,
        background: 'radial-gradient(ellipse 120% 80% at 50% 60%, #1a1240 0%, #070510 55%, #040308 100%)',
      }}
    >
      <Box
        component="img"
        src={mascotSrc()}
        alt="Elephant mascot"
        sx={{
          width: 'min(72vw, 320px)',
          height: 'auto',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
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
        Welcome
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(230, 220, 255, 0.75)', textAlign: 'center' }}>
        Elephant
      </Typography>
    </Box>
  )
}
