import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsTabContentProps {
  children: ReactNode
  /** Optional max width constraint — unconstrained by default */
  maxWidth?: number
  className?: string
}

export default function SettingsTabContent({ children, maxWidth, className }: SettingsTabContentProps) {
  return (
    <div
      className={cn(className)}
      style={maxWidth ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : undefined}
    >
      {children}
    </div>
  )
}
