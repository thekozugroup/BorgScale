import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface SettingsCardProps {
  children: ReactNode
  /** Card-level overrides */
  className?: string
  /** CardContent overrides */
  contentClassName?: string
  // Legacy MUI sx props — ignored; use className instead
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sx?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentSx?: any
}

export default function SettingsCard({ children, className, contentClassName }: SettingsCardProps) {
  return (
    <Card className={cn('rounded-xl', className)}>
      <CardContent className={cn('p-4 md:p-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
