import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Palette,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import { formatRoleLabel } from '../utils/rolePresentation'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  onToggleMobileMenu: () => void
}

function getRoleBadgeClass(roleLabel: string) {
  if (roleLabel === 'Admin') {
    return 'bg-primary/15 text-primary'
  }
  if (roleLabel === 'Operator') {
    return 'bg-muted text-muted-foreground'
  }
  return 'bg-muted text-muted-foreground'
}

export default function AppHeader({ onToggleMobileMenu }: AppHeaderProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { trackAuth, trackNavigation, EventAction } = useAnalytics()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const displayName = user?.full_name?.trim() || user?.username || user?.email || ''
  const roleLabel = formatRoleLabel(user?.role)
  const companyLabel =
    user?.deployment_type === 'enterprise'
      ? user.enterprise_name?.trim() || 'Enterprise deployment'
      : ''

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('')

  const settingsLinks = [
    {
      icon: User,
      label: t('navigation.settings.accountAndSecurity', 'Account & Security'),
      desc: t('navigation.menu.accountAndSecurityDesc', 'Profile, password, 2FA, passkeys'),
      route: '/settings/account',
    },
    {
      icon: Palette,
      label: t('navigation.settings.appearance', 'Appearance'),
      desc: t('navigation.menu.appearanceDesc', 'Theme, language'),
      route: '/settings/appearance',
    },
    {
      icon: Bell,
      label: t('navigation.settings.notifications', 'Notifications'),
      desc: t('navigation.menu.notificationsDesc', 'Alerts & preferences'),
      route: '/settings/notifications',
    },
  ] as const

  return (
    <header className="fixed top-0 right-0 left-0 z-20 flex h-16 items-center border-b border-border/50 bg-background/85 px-4 backdrop-blur-md sm:left-60 sm:px-6">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="mr-2 sm:hidden"
        onClick={onToggleMobileMenu}
        aria-label="open drawer"
      >
        <Menu size={22} />
      </Button>

      <div className="flex-1" />

      {/* User menu */}
      <Popover open={open} onOpenChange={(val) => {
        setOpen(val)
        if (val) {
          trackNavigation(EventAction.VIEW, { surface: 'user_menu' })
        }
      }}>
        <PopoverTrigger asChild>
          <button
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={open}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-transparent px-2 py-1.5 font-[inherit] text-foreground outline-none transition-colors',
              open ? 'bg-muted/70' : 'hover:bg-muted/50'
            )}
          >
            <Avatar className="size-8 rounded-lg border border-primary/30 bg-primary/15">
              <AvatarFallback className="rounded-lg bg-transparent text-sm font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[200px] truncate text-sm font-semibold sm:block">
              {displayName}
            </span>
            <ChevronDown
              size={15}
              className={cn('opacity-50 transition-transform duration-150', open && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[300px] gap-0 overflow-hidden rounded-2xl p-0 shadow-xl ring-1 ring-border/20"
        >
          {/* ── 1. Hero header ── */}
          <div className="flex items-center gap-3 border-b border-border/10 bg-primary/5 px-3.5 py-3">
            <Avatar className="size-11 rounded-xl border border-primary/20 bg-primary/12">
              <AvatarFallback className="rounded-xl bg-transparent text-base font-extrabold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {companyLabel ||
                  t('settings.account.profile.deployment.individual', 'Individual')}
              </p>
              {roleLabel && (
                <span
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wide',
                    getRoleBadgeClass(roleLabel)
                  )}
                >
                  <Shield size={9} />
                  {roleLabel}
                </span>
              )}
            </div>
          </div>

          {/* ── 2. Instance badge ── */}
          <div className="px-2.5 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/40 p-2.5">
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted">
                <Sparkles size={15} className="text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">
                    BorgScale
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border border-border/30 bg-muted px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t('plan.activeStatus', 'Active')}
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {t('plan.openSourceDesc', 'Free and open source (AGPL-3.0)')}
                </p>
              </div>
            </div>
          </div>

          {/* ── 3. Settings nav links ── */}
          <div className="border-t border-border/5 pb-1 pt-0.5">
            <span className="block px-3.5 pb-1 pt-1.5 text-3xs font-medium tracking-wide text-muted-foreground/70">
              {t('navigation.sections.settings', 'Settings')}
            </span>

            {settingsLinks.map(({ icon: Icon, label, desc, route }) => (
              <button
                key={route}
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate(route)
                }}
                className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-1.75 font-[inherit] text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/10 bg-muted/50">
                  <Icon size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight text-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 text-3xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight size={13} className="shrink-0 text-border" />
              </button>
            ))}
          </div>

          <Separator className="opacity-10" />

          {/* ── 4. Logout ── */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                trackAuth(EventAction.LOGOUT, { surface: 'user_menu' })
                logout()
              }}
              className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-1.75 font-[inherit] text-left transition-colors hover:bg-destructive/5"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5">
                <LogOut size={14} className="text-destructive" />
              </div>
              <span className="text-xs font-semibold text-destructive">
                {t('navigation.logout')}
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  )
}
