import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTabEnablement } from '../context/AppContext'
import { useQuery } from '@tanstack/react-query'
import {
  Home,
  FileText,
  Archive,
  Clock,
  Database,
  Computer,
  User,
  History,
  FileCode,
  Settings as SettingsIcon,
  Bell,
  Package,
  Palette,
  Users,
  Download as DownloadIcon,
  Server,
  Zap,
  HardDrive,
  Sliders,
  Wifi,
  Boxes,
} from 'lucide-react'
import api, { settingsAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import NavItem from './NavItem'
import NavGroup from './NavGroup'
import SidebarVersionInfo from './SidebarVersionInfo'
import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader as SheetHdr } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

interface SystemInfo {
  app_version: string
  borg_version: string | null
  borg2_version: string | null
}

interface NavigationItem {
  name: string
  href?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  key: 'dashboard' | 'connections' | 'repositories' | 'backups' | 'archives' | 'schedule'
  subItems?: Array<{
    name: string
    href?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>
    disabled?: boolean
  }>
}

interface AppSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

function SidebarBrandMark() {
  const { t } = useTranslation()
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground no-underline transition-opacity hover:opacity-80"
      aria-label="BorgScale"
    >
      <Boxes size={24} className="shrink-0" />
      <span className="font-bold tracking-wide text-sm">BorgScale</span>
      <span
        className="select-none rounded border border-sidebar-border bg-sidebar-accent px-1 py-0.5 text-[0.6rem] font-bold leading-none text-sidebar-foreground/70"
        aria-hidden="true"
      >
        {t('layout.version', '2.0')}
      </span>
    </Link>
  )
}

interface SidebarNavInnerProps {
  systemInfo: SystemInfo | null
  navigationSections: ReturnType<typeof useNavigationSections>
  expandedMenus: Record<string, boolean>
  toggleMenu: (name: string) => void
  sectionHeadingLabel: (heading: string) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tabEnablement: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTabDisabledReason: (key: any) => string | null
  location: { pathname: string }
  navLabel: (name: string) => string
}

function SidebarNavInner({
  systemInfo,
  navigationSections,
  expandedMenus,
  toggleMenu,
  sectionHeadingLabel,
  tabEnablement,
  getTabDisabledReason,
  location,
  navLabel,
}: SidebarNavInnerProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Brand header */}
      <div className="px-2 py-3">
        <SidebarBrandMark />
      </div>

      <Separator className="mx-2 bg-sidebar-border" />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {navigationSections.map((section: any, sectionIndex: number) => (
          <SidebarGroup key={section.heading || section.segment} className="py-0">
            {section.heading && (
              <SidebarGroupLabel className={sectionIndex === 0 ? 'mt-1' : 'mt-2'}>
                {sectionHeadingLabel(section.heading)}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item: NavigationItem) => {
                  const isEnabled = tabEnablement[item.key]
                  const disabledReason = getTabDisabledReason(item.key)

                  if (item.subItems) {
                    return (
                      <NavGroup
                        key={item.name}
                        name={item.name}
                        icon={item.icon}
                        subItems={item.subItems}
                        isExpanded={expandedMenus[item.name] || false}
                        onToggle={() => toggleMenu(item.name)}
                        currentPath={location.pathname}
                        navLabel={navLabel}
                      />
                    )
                  }

                  const isActive = Boolean(
                    item.href &&
                      (location.pathname === item.href ||
                        location.pathname.startsWith(item.href + '/'))
                  )

                  return (
                    <NavItem
                      key={item.name}
                      name={item.name}
                      href={item.href!}
                      icon={item.icon}
                      isActive={isActive}
                      isEnabled={isEnabled}
                      disabledReason={disabledReason ?? undefined}
                      navLabel={navLabel}
                    />
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </div>

      {/* Footer */}
      <SidebarVersionInfo systemInfo={systemInfo} />
    </div>
  )
}

// Custom hook for navigation sections
function useNavigationSections({
  showMqttNav,
  canManageUsers,
  canManageLicensing,
  canManageSystemSettings,
  canManageMqtt,
  canManagePackages,
  canManageScripts,
  canManageExportImport,
  canManageBeta,
  canManageMounts,
  canManageSsh,
}: {
  showMqttNav: boolean
  canManageUsers: boolean
  canManageLicensing: boolean
  canManageSystemSettings: boolean
  canManageMqtt: boolean
  canManagePackages: boolean
  canManageScripts: boolean
  canManageExportImport: boolean
  canManageBeta: boolean
  canManageMounts: boolean
  canManageSsh: boolean
}) {
  return React.useMemo(() => {
    const backupItems: Array<{
      name: string
      href: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      icon: React.ComponentType<any>
      key: 'connections' | 'repositories' | 'backups' | 'archives' | 'schedule'
    }> = [
      ...(canManageSsh
        ? [
            {
              name: 'Remote Machines',
              href: '/ssh-connections',
              icon: Computer,
              key: 'connections' as const,
            },
          ]
        : []),
      { name: 'Repositories', href: '/repositories', icon: Database, key: 'repositories' as const },
      { name: 'Backup', href: '/backup', icon: FileText, key: 'backups' as const },
      { name: 'Archives', href: '/archives', icon: Archive, key: 'archives' as const },
    ]
    backupItems.push({ name: 'Schedule', href: '/schedule', icon: Clock, key: 'schedule' as const })

    return [
      {
        segment: 'dashboard',
        items: [
          { name: 'Dashboard', href: '/dashboard', icon: Home, key: 'dashboard' as const },
          { name: 'Activity', href: '/activity', icon: History, key: 'dashboard' as const },
        ],
      },
      {
        heading: 'BACKUP',
        items: backupItems,
      },
      {
        heading: 'SETTINGS',
        items: [
          {
            name: 'Personal',
            icon: User,
            key: 'dashboard' as const,
            subItems: [
              { name: 'Account', href: '/settings/account', icon: User },
              ...(canManageUsers ? [{ name: 'Users', href: '/settings/users', icon: Users }] : []),
              { name: 'Appearance', href: '/settings/appearance', icon: Palette },
              { name: 'Preferences', href: '/settings/preferences', icon: Sliders },
              { name: 'Notifications', href: '/settings/notifications', icon: Bell },
            ],
          },
          ...(canManageSystemSettings
            ? [
                {
                  name: 'System',
                  icon: SettingsIcon,
                  key: 'dashboard' as const,
                  subItems: [
                    ...(canManageLicensing
                      ? [{ name: 'Licensing', href: '/settings/licensing', icon: SettingsIcon }]
                      : []),
                    { name: 'System', href: '/settings/system', icon: SettingsIcon },
                    ...(showMqttNav && canManageMqtt
                      ? [{ name: 'MQTT', href: '/settings/mqtt', icon: Wifi }]
                      : []),
                    { name: 'Cache', href: '/settings/cache', icon: Server },
                    { name: 'Logs', href: '/settings/logs', icon: FileText },
                    ...(canManagePackages
                      ? [{ name: 'Packages', href: '/settings/packages', icon: Package }]
                      : []),
                  ],
                },
              ]
            : []),
          {
            name: 'Management',
            icon: HardDrive,
            key: 'dashboard' as const,
            subItems: [
              ...(canManageMounts
                ? [{ name: 'Mounts', href: '/settings/mounts', icon: HardDrive }]
                : []),
              ...(canManageScripts || canManageExportImport
                ? [
                    ...(canManageScripts
                      ? [{ name: 'Scripts', href: '/settings/scripts', icon: FileCode }]
                      : []),
                    ...(canManageExportImport
                      ? [{ name: 'Export/Import', href: '/settings/export', icon: DownloadIcon }]
                      : []),
                  ]
                : []),
            ],
          },
          ...(canManageBeta
            ? [
                {
                  name: 'Advanced',
                  icon: Zap,
                  key: 'dashboard' as const,
                  subItems: [{ name: 'Beta', href: '/settings/beta', icon: Zap }],
                },
              ]
            : []),
        ],
      },
    ]
  }, [
    showMqttNav,
    canManageUsers,
    canManageLicensing,
    canManageSystemSettings,
    canManageMqtt,
    canManagePackages,
    canManageScripts,
    canManageExportImport,
    canManageBeta,
    canManageMounts,
    canManageSsh,
  ])
}

export default function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { hasGlobalPermission } = useAuth()
  const canManageUsers = hasGlobalPermission('settings.users.manage')
  const canManageLicensing = hasGlobalPermission('settings.system.manage')
  const canManageSystemSettings = hasGlobalPermission('settings.system.manage')
  const canManageMqtt = hasGlobalPermission('settings.mqtt.manage')
  const canManagePackages = hasGlobalPermission('settings.packages.manage')
  const canManageScripts = hasGlobalPermission('settings.scripts.manage')
  const canManageExportImport = hasGlobalPermission('settings.export_import.manage')
  const canManageBeta = hasGlobalPermission('settings.beta.manage')
  const canManageMounts = hasGlobalPermission('settings.mounts.manage')
  const canManageSsh = hasGlobalPermission('settings.ssh.manage')
  const { tabEnablement, getTabDisabledReason } = useTabEnablement()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  const navLabel = (name: string): string => {
    const labels: Record<string, string> = {
      Dashboard: t('navigation.items.dashboard'),
      Activity: t('navigation.items.activity'),
      'Remote Machines': t('navigation.items.remoteMachines'),
      Repositories: t('navigation.items.repositories'),
      Backup: t('navigation.items.backup'),
      Archives: t('navigation.items.archives'),
      Restore: t('navigation.items.restore'),
      Schedule: t('navigation.items.schedule'),
      Personal: t('navigation.settings.personal'),
      System: t('navigation.settings.systemLabel'),
      Management: t('navigation.settings.management'),
      Advanced: t('navigation.settings.advanced'),
      Account: t('navigation.settings.account'),
      Appearance: t('navigation.settings.appearance'),
      Preferences: t('navigation.settings.preferences'),
      Notifications: t('navigation.settings.notifications'),
      MQTT: t('navigation.settings.mqtt'),
      Cache: t('navigation.settings.cache'),
      Logs: t('navigation.settings.logs'),
      Packages: t('navigation.settings.packages'),
      Mounts: t('navigation.settings.mounts'),
      Scripts: t('navigation.settings.scripts'),
      Users: t('navigation.settings.users'),
      Licensing: t('navigation.settings.licensing'),
      'Export/Import': t('navigation.settings.exportImport'),
      Beta: t('navigation.settings.beta'),
    }
    return labels[name] ?? name
  }

  const sectionHeadingLabel = (heading: string): string => {
    if (heading === 'BACKUP') return t('navigation.sections.backup')
    if (heading === 'SETTINGS') return t('navigation.sections.settings')
    return heading
  }

  const { data: systemData } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemSettings()
      return response.data
    },
  })

  const showMqttNav = systemData?.settings?.mqtt_beta_enabled ?? false

  const navigationSections = useNavigationSections({
    showMqttNav,
    canManageUsers,
    canManageLicensing,
    canManageSystemSettings,
    canManageMqtt,
    canManagePackages,
    canManageScripts,
    canManageExportImport,
    canManageBeta,
    canManageMounts,
    canManageSsh,
  })

  // Auto-expand menus based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      const path = location.pathname
      if (
        path.includes('/account') ||
        path.includes('/appearance') ||
        path.includes('/preferences') ||
        path.includes('/notifications') ||
        path.includes('/users')
      ) {
        setExpandedMenus((prev) => ({ ...prev, Personal: true }))
      } else if (
        path.includes('/system') ||
        path.includes('/mqtt') ||
        path.includes('/cache') ||
        path.includes('/logs') ||
        path.includes('/packages')
      ) {
        setExpandedMenus((prev) => ({ ...prev, System: true }))
      } else if (
        path.includes('/mounts') ||
        path.includes('/scripts') ||
        path.includes('/export')
      ) {
        setExpandedMenus((prev) => ({ ...prev, Management: true }))
      } else if (path.includes('/beta')) {
        setExpandedMenus((prev) => ({ ...prev, Advanced: true }))
      }
    }
  }, [location.pathname])

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await api.get('/system/info')
        setSystemInfo(response.data)
      } catch (error) {
        console.error('Failed to fetch system info:', error)
      }
    }
    fetchSystemInfo()
  }, [])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }))
  }

  const navProps = {
    systemInfo,
    navigationSections,
    expandedMenus,
    toggleMenu,
    sectionHeadingLabel,
    tabEnablement,
    getTabDisabledReason,
    location,
    navLabel,
  }

  return (
    <SidebarProvider defaultOpen>
      <nav aria-label="Application navigation">
        {/* Desktop permanent sidebar */}
        <div className="hidden w-60 shrink-0 sm:block">
          <div className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
            <SidebarNavInner {...navProps} />
          </div>
        </div>

        {/* Mobile overlay via Sheet */}
        <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onClose() }}>
          <SheetContent
            side="left"
            className="w-60 p-0 bg-sidebar text-sidebar-foreground"
            showCloseButton={false}
          >
            <SheetHdr className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Application navigation sidebar</SheetDescription>
            </SheetHdr>
            <SidebarNavInner {...navProps} />
          </SheetContent>
        </Sheet>
      </nav>
    </SidebarProvider>
  )
}
