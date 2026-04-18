import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { normalizeRouterBasename } from '@/lib/router/basename'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b2239' },
    secondary: { main: '#2a9d8f' },
  },
  shape: {
    borderRadius: 12,
  },
})

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename={normalizeRouterBasename(import.meta.env.BASE_URL)}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
