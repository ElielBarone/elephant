import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { DarkModeOutlined, LightModeOutlined } from '@mui/icons-material'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { AppLocale } from '@/lib/locale/LocaleContext'
import type { MouseEvent } from 'react'
import { useState } from 'react'
import { appLocaleLabels, appLocales, useLocale } from '@/lib/locale/LocaleContext'
import { IdiomFlag } from '@/components/IdiomFlag'

function appLogoSrc() {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}elephant-logo.png`
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { locale, setLocale } = useLocale()
  const [languageAnchor, setLanguageAnchor] = useState<HTMLElement | null>(null)
  const isStudyPage = location.pathname.includes('/study')
  const { mode, toggleTheme } = useTheme()

  const openLanguagePopover = (event: MouseEvent<HTMLElement>) => {
    setLanguageAnchor(event.currentTarget)
  }

  const closeLanguagePopover = () => {
    setLanguageAnchor(null)
  }

  const handleLocaleSelect = (nextLocale: AppLocale) => {
    setLocale(nextLocale)
    closeLanguagePopover()
  }

  const isLanguagePopoverOpen = Boolean(languageAnchor)

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
              onClick={openLanguagePopover}
              aria-label={t('app.language')}
              sx={{ p: 0.5 }}
            >
              <IdiomFlag idiom={locale} height={24} />
            </IconButton>
            <Popover
              open={isLanguagePopoverOpen}
              anchorEl={languageAnchor}
              onClose={closeLanguagePopover}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <List dense>
                {appLocales.map((value) => (
                  <ListItemButton
                    key={value}
                    selected={value === locale}
                    onClick={() => handleLocaleSelect(value)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <IdiomFlag idiom={value} height={20} />
                    </ListItemIcon>
                    <ListItemText primary={appLocaleLabels[value]} />
                  </ListItemButton>
                ))}
              </List>
            </Popover>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label={t('app.toggleTheme')}
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
