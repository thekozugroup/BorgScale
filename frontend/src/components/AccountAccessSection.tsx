import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ApiTokensSection from './ApiTokensSection'
import UserPermissionsPanel from './UserPermissionsPanel'

interface AccountAccessSectionProps {
  hasGlobalRepositoryAccess: boolean
}

export default function AccountAccessSection({
  hasGlobalRepositoryAccess,
}: AccountAccessSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-row items-center gap-[5px] mb-1">
          <ShieldCheck size={16} style={{ opacity: 0.6 }} />
          <span className="text-sm font-bold">{t('settings.account.access.title')}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('settings.account.access.description')}</p>
      </div>
      <ApiTokensSection />
      {!hasGlobalRepositoryAccess ? (
        <UserPermissionsPanel
          title={t('settings.account.access.permissions.title')}
          subtitle={t('settings.account.access.permissions.subtitle')}
        />
      ) : (
        <div className="px-5 py-4 border border-border rounded-xl flex items-center gap-3 bg-muted/40">
          <ShieldCheck size={16} className="text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-bold">{t('settings.account.access.globalAccess.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('settings.account.access.globalAccess.description')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
