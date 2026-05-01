import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountSecuritySectionProps {
  onOpenChangePassword: () => void
}

export default function AccountSecuritySection({
  onOpenChangePassword,
}: AccountSecuritySectionProps) {
  const { t } = useTranslation()
  const title = t('settings.account.security.accountPassword')
  const description = t('settings.account.security.changeCredentialsHint')

  return (
    <div
      onClick={onOpenChangePassword}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenChangePassword()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={title}
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-colors',
        'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex flex-row gap-4 items-center min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border bg-muted/40"
        >
          <Lock size={16} style={{ opacity: 0.45 }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 tracking-wide">
        →
      </span>
    </div>
  )
}
