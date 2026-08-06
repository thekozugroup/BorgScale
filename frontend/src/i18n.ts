import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'
import de from './locales/de.json'
import it from './locales/it.json'

// WCAG 3.1.1/3.1.2: keep <html lang> in sync with the active language so
// screen readers switch pronunciation. Registered before init so the
// languageChanged event fired during init also sets the initial value.
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
})

i18n.use(initReactI18next).init({
  lng:
    (typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null) ||
    (typeof navigator !== 'undefined' ? navigator.language : null) ||
    'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  resources: {
    en: {
      translation: en,
    },
    es: {
      translation: es,
    },
    de: {
      translation: de,
    },
    it: {
      translation: it,
    },
  },
  interpolation: {
    escapeValue: false, // React handles XSS
  },
  returnNull: false,
  // QUAL-01: Warn on missing keys in development — requires saveMissing: true to fire
  saveMissing: true,
  missingKeyHandler: (_lngs, _ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`)
    }
  },
})

export default i18n
