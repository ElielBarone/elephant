import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import i18n from '@/lib/i18n'

export type AppLocale = 'ptBR' | 'enUS'

export const appLocales: AppLocale[] = ['ptBR', 'enUS']

export const appLocaleLabels: Record<AppLocale, string> = {
  ptBR: 'Português (BR)',
  enUS: 'English (US)',
}

const LOCALE_STORAGE_KEY = 'elephant:locale'

interface LocaleContextType {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

function readLocaleFromStorage(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'ptBR' || stored === 'enUS') {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read locale from localStorage:', error)
  }
  return 'ptBR'
}

function writeLocaleToStorage(locale: AppLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch (error) {
    console.warn('Failed to write locale to localStorage:', error)
  }
}

interface LocaleProviderProps {
  children: ReactNode
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readLocaleFromStorage())

  useEffect(() => {
    i18n.changeLanguage(locale).catch(() => {
      console.warn(`Failed to change language to ${locale}`)
    })
    writeLocaleToStorage(locale)
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setLocaleState }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
