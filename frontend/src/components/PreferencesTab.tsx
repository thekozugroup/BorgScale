import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import i18n from '../i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export default function PreferencesTab() {
  const { t } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem('i18nextLng')?.split('-')[0] || i18n.language?.split('-')[0] || 'en'
  )

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode)
    i18n.changeLanguage(langCode)
    localStorage.setItem('i18nextLng', langCode)
    toast.success(t('preferences.languageSaved'))
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">{t('preferences.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('preferences.subtitle')}</p>
      </div>

      {/* Language Section */}
      <SettingsCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Globe size={24} className="shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-semibold mb-1">{t('preferences.languageTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('preferences.languageDescription')}
            </p>
            <div className="w-full sm:w-48">
              <Label htmlFor="language-select" className="sr-only">
                {t('preferences.languageLabel')}
              </Label>
              <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language-select" className="w-full">
                  <SelectValue placeholder={t('preferences.languageLabel')} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Future preferences sections can be added here */}
    </div>
  )
}
