import { useRef } from 'react'
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
  const tabRefs = useRef<Record<AccountView, HTMLButtonElement | null>>({
    profile: null,
    security: null,
    access: null,
  })
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

  // Roving tabindex (WAI-ARIA tabs pattern): arrows move focus, Enter/Space
  // activate via the button's native click behaviour
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    tabRefs.current[tabs[nextIndex].value]?.focus()
  }

  return (
    <div className="border-b border-border overflow-x-auto">
      <div
        role="tablist"
        aria-label={t('settings.account.title', 'Account settings')}
        className="flex px-1 md:px-2 min-w-max"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          const isSelected = value === tab.value
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[tab.value] = el
              }}
              role="tab"
              id={`account-tab-${tab.value}`}
              aria-selected={isSelected}
              aria-controls={`account-panel-${tab.value}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
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
