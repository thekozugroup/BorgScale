import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SubItem {
  name: string
  href?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  disabled?: boolean
}

interface NavGroupProps {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  subItems: SubItem[]
  isExpanded: boolean
  onToggle: () => void
  currentPath: string
  navLabel: (name: string) => string
}

export default function NavGroup({
  name,
  icon: Icon,
  subItems,
  isExpanded,
  onToggle,
  currentPath,
  navLabel,
}: NavGroupProps) {
  const isAnySubItemActive = subItems.some((sub) => sub.href && currentPath.startsWith(sub.href))

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onToggle}
        isActive={isAnySubItemActive}
        className="rounded-md"
      >
        <Icon size={18} />
        <span>{navLabel(name)}</span>
        {isExpanded ? (
          <ChevronDown size={14} className="ml-auto shrink-0 opacity-60" />
        ) : (
          <ChevronRight size={14} className="ml-auto shrink-0 opacity-60" />
        )}
      </SidebarMenuButton>

      {isExpanded && (
        <SidebarMenuSub>
          {subItems.map((subItem) => {
            const isActive = subItem.href ? currentPath.startsWith(subItem.href) : false
            const SubIcon = subItem.icon
            const isDisabled = subItem.disabled === true

            const subButton = (
              <SidebarMenuSubButton
                asChild={!isDisabled}
                isActive={isActive}
                aria-current={isActive ? 'page' : undefined}
                {...(isDisabled ? { 'aria-disabled': true, style: { opacity: 0.4, pointerEvents: 'none' } } : {})}
              >
                {isDisabled ? (
                  <div className="flex items-center gap-2">
                    <SubIcon size={15} />
                    <span>{navLabel(subItem.name)}</span>
                  </div>
                ) : (
                  <Link to={subItem.href ?? '#'}>
                    <SubIcon size={15} />
                    <span>{navLabel(subItem.name)}</span>
                  </Link>
                )}
              </SidebarMenuSubButton>
            )

            return (
              <SidebarMenuSubItem key={subItem.name}>
                {isDisabled ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">{subButton}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right">Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  subButton
                )}
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}
