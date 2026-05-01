import { KeyRound, ShieldCheck, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type AccountView = 'profile' | 'security' | 'access'

interface AccountTabNavigationProps {
  value: AccountView
  onChange: (view: AccountView) => void
  showSecurityTab?: boolean
}

export default function AccountTabNavigation({
  value,
  onChange,
  showSecurityTab = true,
}: AccountTabNavigationProps) {
  const { t } = useTranslation()
  const tabs = showSecurityTab
    ? [
        { value: 'profile' as const, label: t('settings.account.profile.title'), icon: User },
        { value: 'security' as const, label: t('settings.account.security.title'), icon: KeyRound },
        { value: 'access' as const, label: t('settings.account.access.title'), icon: ShieldCheck },
      ]
    : [
        { value: 'profile' as const, label: t('settings.account.profile.title'), icon: User },
        { value: 'access' as const, label: t('settings.account.access.title'), icon: ShieldCheck },
      ]

  return (
    <div className="border-b border-border overflow-x-auto">
      <div className="flex px-1 md:px-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isSelected = value === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                isSelected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
