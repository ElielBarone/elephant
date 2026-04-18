import MenuBookIcon from '@mui/icons-material/MenuBook'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom'

export function AppShell() {
  const navigate = useNavigate()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <IconButton
            edge="start"
            color="inherit"
            component={RouterLink}
            to="/"
            aria-label="home"
          >
            <MenuBookIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
            component="div"
          >
            Elephant
          </Typography>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
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
