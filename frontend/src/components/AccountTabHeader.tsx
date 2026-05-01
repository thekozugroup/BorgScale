import { useTranslation } from 'react-i18next'

export default function AccountTabHeader() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-lg font-bold mb-1">{t('settings.account.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('settings.account.description')}</p>
    </div>
  )
}
