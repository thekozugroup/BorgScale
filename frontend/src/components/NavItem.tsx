import React from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  const button = (
    <SidebarMenuButton
      asChild={isEnabled}
      isActive={isActive}
      aria-current={isActive ? 'page' : undefined}
      disabled={!isEnabled}
      aria-disabled={!isEnabled}
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
        </TooltipProvider>
      ) : (
        button
      )}
    </SidebarMenuItem>
  )
}
