import { KeyRound, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PasskeyCredentialResponse } from '../services/api'

interface AccountPasskeysSectionProps {
  passkeys: PasskeyCredentialResponse[]
  loading: boolean
  onAdd: () => void
  onDelete: (passkeyId: number) => void
}

export default function AccountPasskeysSection({
  passkeys,
  loading,
  onAdd,
  onDelete,
}: AccountPasskeysSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="text-sm font-bold mb-1">
        {t('settings.account.security.passkeysTitle')}
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        {t('settings.account.security.passkeysDescription')}
      </p>
      <div
        className={cn(
          'p-5 mb-3 rounded-2xl border border-border',
          passkeys.length > 0 ? 'bg-primary/5' : 'bg-muted/20'
        )}
      >
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-row gap-3 items-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/40">
              <KeyRound size={18} />
            </div>
            <div>
              <span
                className={cn(
                  'block text-xs font-bold uppercase tracking-wide mb-0.5',
                  passkeys.length > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {passkeys.length > 0
                  ? t('settings.account.security.statusReady')
                  : t('settings.account.security.statusNotConfigured')}
              </span>
              <p className="text-sm font-bold">
                {passkeys.length > 0
                  ? t('settings.account.security.passkeysCount', { count: passkeys.length })
                  : t('settings.account.security.noPasskeys')}
              </p>
              <p className="text-xs text-muted-foreground">
                {passkeys.length > 0
                  ? t('settings.account.security.passkeysManageHint')
                  : t('settings.account.security.passkeyEmptyHint')}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onAdd}
            disabled={loading}
            className="w-full md:w-auto whitespace-nowrap self-stretch md:self-center"
          >
            {t('settings.account.security.addPasskey')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {passkeys.length > 0 &&
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="p-4 rounded-lg border border-border flex items-center justify-between gap-4"
            >
              <div className="flex flex-row gap-3 items-center">
                <KeyRound size={16} />
                <div>
                  <p className="text-sm font-semibold">{passkey.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {passkey.last_used_at
                      ? t('settings.account.security.passkeyLastUsed', {
                          date: new Date(passkey.last_used_at).toLocaleString(),
                        })
                      : t('settings.account.security.passkeyNeverUsed')}
                  </p>
                </div>
              </div>
              <button
                aria-label={t('common.buttons.delete')}
                onClick={() => onDelete(passkey.id)}
                disabled={loading}
                className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
