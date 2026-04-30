import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { Globe } from 'lucide-react'
import SettingsCard from './SettingsCard'
import { toast } from 'react-hot-toast'
import i18n from '../i18n'

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
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t('preferences.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('preferences.subtitle')}
        </Typography>
      </Box>

      {/* Language Section */}
      <SettingsCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Globe size={24} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {t('preferences.languageTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('preferences.languageDescription')}
            </Typography>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 } }}>
              <InputLabel>{t('preferences.languageLabel')}</InputLabel>
              <Select
                value={currentLanguage}
                label={t('preferences.languageLabel')}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </SettingsCard>

      {/* Future preferences sections can be added here */}
    </Box>
  )
}
