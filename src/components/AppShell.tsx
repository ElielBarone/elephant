import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { DarkModeOutlined, LightModeOutlined } from '@mui/icons-material'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '@/lib/theme/ThemeContext'

function appLogoSrc() {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}elephant-logo.png`
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const isStudyPage = location.pathname.includes('/study')
  const { mode, toggleTheme } = useTheme()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {!isStudyPage && (
        <AppBar position="sticky" color="default" elevation={0}>
          <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
            <IconButton
              edge="start"
              color="inherit"
              component={RouterLink}
              to="/"
              aria-label="home"
              sx={{ p: 0.5 }}
            >
              <Box
                component="img"
                src={appLogoSrc()}
                alt=""
                sx={{ height: 32, width: 'auto', display: 'block' }}
              />
            </IconButton>
            <Typography
              variant="h6"
              sx={{ flexGrow: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
              component="div"
            >
              Elephant
            </Typography>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label="toggle theme"
              sx={{ p: 0.5 }}
            >
              {mode === 'light' ? <DarkModeOutlined /> : <LightModeOutlined />}
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          py: 2,
          px: { xs: 2, sm: 3 },
          pb: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}
