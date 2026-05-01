import { KeyRound, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AccountTotpSectionProps {
  enabled: boolean
  recoveryCodesRemaining: number
  loading: boolean
  onEnable: () => void
  onDisable: () => void
}

export default function AccountTotpSection({
  enabled,
  recoveryCodesRemaining,
  loading,
  onEnable,
  onDisable,
}: AccountTotpSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="text-sm font-bold mb-1">{t('settings.account.security.totpTitle')}</p>
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.account.security.totpDescription')}
      </p>

      <div
        className={cn(
          'p-5 rounded-2xl border border-border',
          enabled ? 'bg-primary/5' : 'bg-muted/20'
        )}
      >
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-row gap-3 items-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/40">
              {enabled ? <ShieldCheck size={18} /> : <KeyRound size={18} />}
            </div>
            <div>
              <span
                className={cn(
                  'block text-xs font-bold uppercase tracking-wide mb-0.5',
                  enabled ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {enabled
                  ? t('settings.account.security.statusActive')
                  : t('settings.account.security.statusNotEnabled')}
              </span>
              <p className="text-sm font-bold">
                {enabled
                  ? t('settings.account.security.totpEnabled')
                  : t('settings.account.security.totpDisabled')}
              </p>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? t('settings.account.security.recoveryCodesRemaining', {
                      count: recoveryCodesRemaining,
                    })
                  : t('settings.account.security.totpDisabledHint')}
              </p>
            </div>
          </div>

          <div className="flex flex-row gap-2 flex-wrap w-full md:w-auto self-start md:self-center">
            <Button
              variant={enabled ? 'outline' : 'default'}
              onClick={enabled ? onDisable : onEnable}
              disabled={loading}
              className="min-w-full sm:min-w-40 md:min-w-0"
            >
              {enabled
                ? t('settings.account.security.disableTotp')
                : t('settings.account.security.enableTotp')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
