import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { normalizeRouterBasename } from '@/lib/router/basename'
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext'

function AppWithTheme() {
  const { mode } = useTheme()

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: '#5b2dff' },
      secondary: { main: '#2a9d8f' },
      ...(mode === 'light'
        ? {
            background: { default: 'rgb(229 224 249 / 50%)' },
          }
        : {}),
    },
    shape: {
      borderRadius: 12,
    },
  })

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename={normalizeRouterBasename(import.meta.env.BASE_URL)}>
        <App />
      </BrowserRouter>
    </MuiThemeProvider>
  )
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  </StrictMode>,
)
