import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from '@/locales/enUS'
import ptBR from '@/locales/ptBR'

const resources = {
  ptBR: {
    translation: ptBR,
  },
  enUS: {
    translation: enUS,
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ptBR',
  fallbackLng: 'ptBR',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export default i18n
