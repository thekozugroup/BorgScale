import { KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AccountPasskeysSection from './AccountPasskeysSection'
import AccountTotpSection from './AccountTotpSection'
import type { PasskeyCredentialResponse } from '../services/api'

interface AccountSecuritySettingsSectionProps {
  totpEnabled: boolean
  recoveryCodesRemaining: number
  totpLoading: boolean
  onEnableTotp: () => void
  onDisableTotp: () => void
  passkeys: PasskeyCredentialResponse[]
  passkeysLoading: boolean
  onAddPasskey: () => void
  onDeletePasskey: (passkeyId: number) => void
}

export default function AccountSecuritySettingsSection({
  totpEnabled,
  recoveryCodesRemaining,
  totpLoading,
  onEnableTotp,
  onDisableTotp,
  passkeys,
  passkeysLoading,
  onAddPasskey,
  onDeletePasskey,
}: AccountSecuritySettingsSectionProps) {
  const { t } = useTranslation()

  const securityHighlights = [
    {
      label: t('settings.account.security.highlights.twoFactor'),
      value: totpEnabled
        ? t('settings.account.security.statusActive')
        : t('settings.account.security.statusNotEnabled'),
      active: totpEnabled,
    },
    {
      label: t('settings.account.security.highlights.passkeys'),
      value:
        passkeys.length > 0
          ? t('settings.account.security.passkeysCount', { count: passkeys.length })
          : t('settings.account.security.statusNotConfigured'),
      active: passkeys.length > 0,
    },
  ]

  return (
    <div className="flex flex-col gap-7">
      <div className="px-4 md:px-6 py-5 md:py-7 rounded-2xl border border-border bg-muted/20">
        <div className="flex flex-col gap-5">
          <div className="flex flex-row gap-3 items-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-border bg-muted/40">
              <KeyRound size={16} />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                {t('settings.account.security.overline')}
              </span>
              <h3 className="text-base font-bold leading-tight">
                {t('settings.account.security.title')}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-2xl md:text-[0.95rem]">
            {t('settings.account.security.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {securityHighlights.map((highlight) => (
              <div
                key={highlight.label}
                className={`p-4 rounded-2xl border min-h-[88px] ${highlight.active ? 'border-border bg-primary/5' : 'border-border bg-muted/30'}`}
              >
                <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  {highlight.label}
                </span>
                <p className="text-sm font-bold">{highlight.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <AccountTotpSection
          enabled={totpEnabled}
          recoveryCodesRemaining={recoveryCodesRemaining}
          loading={totpLoading}
          onEnable={onEnableTotp}
          onDisable={onDisableTotp}
        />

        <AccountPasskeysSection
          passkeys={passkeys}
          loading={passkeysLoading}
          onAdd={onAddPasskey}
          onDelete={onDeletePasskey}
        />
      </div>
    </div>
  )
}
