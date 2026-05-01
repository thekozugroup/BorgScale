import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BorgVersionChipProps {
  borgVersion: number | undefined
  /** Use compact sizing for dense contexts like dropdown menus */
  compact?: boolean
}

export default function BorgVersionChip({ borgVersion, compact = false }: BorgVersionChipProps) {
  if (borgVersion !== 2) return null

  return (
    <Badge
      className={cn(
        'font-mono font-bold bg-primary text-primary-foreground border-transparent tracking-[0.5px]',
        compact ? 'h-4 px-[3px] text-3xs' : 'h-[18px] px-1.5 text-2xs'
      )}
    >
      v2
    </Badge>
  )
}
