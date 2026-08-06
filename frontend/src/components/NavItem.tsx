import React from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItemProps {
  name: string
  href: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  isActive: boolean
  isEnabled: boolean
  disabledReason?: string
  navLabel: (name: string) => string
  disabled?: boolean
}

export default function NavItem({
  name,
  href,
  icon: Icon,
  isActive,
  isEnabled,
  disabledReason,
  navLabel,
}: NavItemProps) {
  const reasonId = React.useId()

  const button = (
    <SidebarMenuButton
      asChild={isEnabled}
      isActive={isActive}
      aria-current={isActive ? 'page' : undefined}
      // aria-disabled instead of disabled keeps the item focusable so screen
      // reader users can reach it and hear why it is locked (WCAG 2.1.1)
      aria-disabled={!isEnabled || undefined}
      aria-describedby={!isEnabled && disabledReason ? reasonId : undefined}
      className="rounded-md"
    >
      {isEnabled ? (
        <Link to={href}>
          <Icon size={18} />
          <span>{navLabel(name)}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <Lock size={18} />
          <span>{navLabel(name)}</span>
        </div>
      )}
    </SidebarMenuButton>
  )

  return (
    <SidebarMenuItem>
      {!isEnabled && disabledReason ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">{button}</div>
            </TooltipTrigger>
            <TooltipContent side="right">{disabledReason}</TooltipContent>
          </Tooltip>
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        </TooltipProvider>
      ) : (
        button
      )}
    </SidebarMenuItem>
  )
}
